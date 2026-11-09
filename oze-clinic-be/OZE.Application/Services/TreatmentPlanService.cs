using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class TreatmentPlanService : ITreatmentPlanService
    {
        private readonly ITreatmentPlanRepository _treatmentPlanRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IMedicalRecordRepository _medicalRecordRepository;
        private readonly IServiceRepository _serviceRepository;

        public TreatmentPlanService(
            ITreatmentPlanRepository treatmentPlanRepository,
            IStaffRepository staffRepository,
            IMedicalRecordRepository medicalRecordRepository,
            IServiceRepository serviceRepository)
        {
            _treatmentPlanRepository = treatmentPlanRepository;
            _staffRepository = staffRepository;
            _medicalRecordRepository = medicalRecordRepository;
            _serviceRepository = serviceRepository;
        }

        // A doctor works only on the plans of patients they examine, like the medical record itself
        private async Task<StaffProfile> EnsureAccessAsync(string userId, TreatmentPlan plan)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.DoctorScheduleMessage.DoctorNotFound);
            var hasAccess = plan.CreatedByDoctorId == doctor!.Id
                || await _medicalRecordRepository.HasDoctorAccessAsync(doctor.Id, plan.PatientId);
            ConditionGuard.Ensure<ForbiddenException>(hasAccess, ErrorConstants.TreatmentPlanMessage.NoAccess);
            return doctor;
        }

        public async Task<TreatmentPlanProgressResponse> CreateAsync(
            long examinationId,
            CreateTreatmentPlanRequest request,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.DoctorScheduleMessage.DoctorNotFound);

            // Only the examining doctor plans, and only while the examination is still open
            var examination = await _treatmentPlanRepository.GetExaminationAsync(examinationId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(examination != null, ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
            ConditionGuard.Ensure<ForbiddenException>(examination!.DoctorId == doctor!.Id, ErrorConstants.ExaminationMessage.NotExaminingDoctor);
            ConditionGuard.Ensure(examination.ExaminationStatus == ExaminationConstants.InProgress, ErrorConstants.ExaminationMessage.AlreadyLocked);

            var hasOpenPlan = await _treatmentPlanRepository.HasOpenPlanAsync(examinationId, cancellationToken);
            ConditionGuard.ThrowIf(hasOpenPlan, ErrorConstants.TreatmentPlanMessage.OpenPlanExists);

            var validStages = await ValidateStagesAsync(request.Stages, cancellationToken);

            var now = DateTimeOffset.UtcNow;
            var plan = new TreatmentPlan
            {
                ExaminationId = examination.Id,
                PatientId = examination.PatientId,
                CreatedByDoctorId = doctor.Id,
                PlanName = request.PlanName.Trim(),
                Description = Clean(request.Description),
                Status = TreatmentPlanConstants.Draft,
                CreatedAt = now
            };

            foreach (var validStage in validStages)
            {
                var stage = new TreatmentPlanStage
                {
                    StageStatus = TreatmentPlanConstants.StageStatus.Scheduled,
                    CreatedAt = now
                };
                ApplyStage(stage, validStage, plan.Stages.Count + 1);
                plan.Stages.Add(stage);
            }

            SetTotals(plan);

            // Saving the examination row checks its row version: two plans created at once, or a plan racing
            // with "complete examination", end in 409 instead of slipping past the checks above
            examination.UpdatedAt = now;

            await _treatmentPlanRepository.AddAsync(plan, cancellationToken);
            await _treatmentPlanRepository.SaveChangesAsync(cancellationToken);

            // Read back with service names for the response
            var created = await _treatmentPlanRepository.GetByIdWithStagesAsync(plan.Id, cancellationToken);
            return ToProgressResponse(created!);
        }

        public async Task<TreatmentPlanProgressResponse> UpdateAsync(
            long treatmentPlanId,
            UpdateTreatmentPlanRequest request,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetTrackedByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);
            await EnsureAccessAsync(userId, plan!);

            // Once approved the plan is a commitment with the patient; changes then go through a new version
            ConditionGuard.Ensure(plan!.Status == TreatmentPlanConstants.Draft || plan.Status == TreatmentPlanConstants.Proposed,
                ErrorConstants.TreatmentPlanMessage.PlanNotEditable);
            var invoiced = await _treatmentPlanRepository.IsInvoicedAsync(plan.Id, cancellationToken);
            ConditionGuard.ThrowIf(invoiced, ErrorConstants.TreatmentPlanMessage.PlanInvoiced);

            var validStages = await ValidateStagesAsync(request.Stages, cancellationToken);

            // A stage sent with an id is kept and changed, one left out is removed, one without an id is new
            var keptIds = request.Stages.Where(s => s.Id.HasValue).Select(s => s.Id!.Value).ToList();
            ConditionGuard.Ensure(keptIds.Count == keptIds.Distinct().Count(), ErrorConstants.TreatmentPlanMessage.DuplicateStage);
            var existingStages = plan.Stages.ToDictionary(s => s.Id);
            ConditionGuard.Ensure<NotFoundException>(keptIds.All(existingStages.ContainsKey), ErrorConstants.TreatmentPlanMessage.StageNotFound);

            foreach (var removedStage in plan.Stages.Where(s => !keptIds.Contains(s.Id)).ToList())
            {
                plan.Stages.Remove(removedStage);
            }

            var now = DateTimeOffset.UtcNow;
            for (var i = 0; i < validStages.Count; i++)
            {
                var stageId = request.Stages[i].Id;
                TreatmentPlanStage stage;
                if (stageId.HasValue)
                {
                    stage = existingStages[stageId.Value];
                    stage.UpdatedAt = now;
                }
                else
                {
                    stage = new TreatmentPlanStage
                    {
                        StageStatus = TreatmentPlanConstants.StageStatus.Scheduled,
                        CreatedAt = now
                    };
                    plan.Stages.Add(stage);
                }

                ApplyStage(stage, validStages[i], i + 1);
            }

            plan.PlanName = request.PlanName.Trim();
            plan.Description = Clean(request.Description);
            SetTotals(plan);

            // A plan already shown to the patient goes back to draft: the patient has to see the new version
            if (plan.Status == TreatmentPlanConstants.Proposed)
            {
                plan.Status = TreatmentPlanConstants.Draft;
            }

            plan.UpdatedAt = now;

            await _treatmentPlanRepository.SaveChangesAsync(cancellationToken);

            var updated = await _treatmentPlanRepository.GetByIdWithStagesAsync(plan.Id, cancellationToken);
            return ToProgressResponse(updated!);
        }

        public async Task DeleteAsync(
            long treatmentPlanId,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetTrackedByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);
            await EnsureAccessAsync(userId, plan!);

            // Only a draft is thrown away; a plan the patient has seen is cancelled instead, so its history stays
            ConditionGuard.Ensure(plan!.Status == TreatmentPlanConstants.Draft, ErrorConstants.TreatmentPlanMessage.OnlyDraftCanBeDeleted);
            var invoiced = await _treatmentPlanRepository.IsInvoicedAsync(plan.Id, cancellationToken);
            ConditionGuard.ThrowIf(invoiced, ErrorConstants.TreatmentPlanMessage.PlanInvoiced);

            _treatmentPlanRepository.Remove(plan);
            await _treatmentPlanRepository.SaveChangesAsync(cancellationToken);
        }

        public async Task<TreatmentPlanProgressResponse> GetDetailAsync(
            long treatmentPlanId,
            string userId,
            bool canViewAll,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);
            if (!canViewAll)
            {
                await EnsureAccessAsync(userId, plan!);
            }

            return ToProgressResponse(plan!);
        }

        public async Task<List<TreatmentPlanSummaryResponse>> GetByPatientAsync(
            int patientId,
            bool includeClosed,
            string userId,
            bool canViewAll,
            CancellationToken cancellationToken = default)
        {
            var patientExists = await _treatmentPlanRepository.PatientExistsAsync(patientId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(patientExists, ErrorConstants.MedicalRecordMessage.PatientNotFound);

            if (!canViewAll)
            {
                var doctor = await _staffRepository.GetByUserIdAsync(userId);
                ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.DoctorScheduleMessage.DoctorNotFound);
                var hasAccess = await _medicalRecordRepository.HasDoctorAccessAsync(doctor!.Id, patientId);
                ConditionGuard.Ensure<ForbiddenException>(hasAccess, ErrorConstants.TreatmentPlanMessage.NoAccess);
            }

            var plans = await _treatmentPlanRepository.GetByPatientAsync(patientId, includeClosed, cancellationToken);
            foreach (var plan in plans)
            {
                plan.ProgressPercent = ProgressPercent(plan.CompletedStages, plan.TotalStages - plan.CancelledStages);
            }

            return plans;
        }

        public async Task<TreatmentPlanProgressResponse> GetProgressAsync(
            long treatmentPlanId,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);
            await EnsureAccessAsync(userId, plan!);

            return ToProgressResponse(plan!);
        }

        public async Task<TreatmentPlanProgressResponse> StartStageAsync(
            long treatmentPlanId,
            long stageId,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetTrackedByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);
            await EnsureAccessAsync(userId, plan!);

            var stage = plan!.Stages.FirstOrDefault(s => s.Id == stageId);
            ConditionGuard.Ensure<NotFoundException>(stage != null, ErrorConstants.TreatmentPlanMessage.StageNotFound);

            var planCanStart = plan.Status == TreatmentPlanConstants.Approved
                || plan.Status == TreatmentPlanConstants.InProgress;
            ConditionGuard.Ensure(planCanStart, ErrorConstants.TreatmentPlanMessage.PlanNotApproved);

            ConditionGuard.Ensure(
                stage!.StageStatus == TreatmentPlanConstants.StageStatus.Scheduled,
                ErrorConstants.TreatmentPlanMessage.StageNotScheduled);

            var earlierStageOpen = plan.Stages.Any(s =>
                s.StageNumber < stage.StageNumber
                && s.StageStatus != TreatmentPlanConstants.StageStatus.Completed
                && s.StageStatus != TreatmentPlanConstants.StageStatus.Cancelled);
            ConditionGuard.ThrowIf(earlierStageOpen, ErrorConstants.TreatmentPlanMessage.EarlierStageNotCompleted);

            var now = DateTimeOffset.UtcNow;
            stage.StageStatus = TreatmentPlanConstants.StageStatus.InProgress;
            stage.UpdatedAt = now;

            if (plan.Status == TreatmentPlanConstants.Approved)
            {
                plan.Status = TreatmentPlanConstants.InProgress;
                plan.UpdatedAt = now;
            }

            await _treatmentPlanRepository.SaveChangesAsync(cancellationToken);
            return ToProgressResponse(plan);
        }

        public async Task<TreatmentPlanProgressResponse> UpdateStageAsync(
            long treatmentPlanId,
            long stageId,
            UpdateTreatmentStageRequest request,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetTrackedByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);
            await EnsureAccessAsync(userId, plan!);

            var stage = plan!.Stages.FirstOrDefault(s => s.Id == stageId);
            ConditionGuard.Ensure<NotFoundException>(stage != null, ErrorConstants.TreatmentPlanMessage.StageNotFound);

            ConditionGuard.Ensure(
                stage!.StageStatus == TreatmentPlanConstants.StageStatus.InProgress,
                ErrorConstants.TreatmentPlanMessage.StageNotInProgress);

            // A field left out of the request keeps its value; an empty note clears it
            var notes = request.Notes == null ? stage.Notes : (string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim());
            var actualCost = request.ActualCost ?? stage.ActualCost;

            if (request.ActualCost.HasValue)
            {
                ConditionGuard.Ensure(
                    request.ActualCost.Value >= 0,
                    ErrorConstants.TreatmentPlanMessage.InvalidActualCost);
            }

            if (actualCost.HasValue)
            {
                var costDiffers = actualCost.Value != stage.EstimatedCost;
                ConditionGuard.ThrowIf(
                    costDiffers && notes == null,
                    ErrorConstants.TreatmentPlanMessage.NotesRequiredWhenCostDiffers);
            }

            var now = DateTimeOffset.UtcNow;

            if (request.NextStageScheduledDate.HasValue)
            {
                ApplyNextStageDate(plan, stage, request.NextStageScheduledDate.Value, now);
            }

            stage.Notes = notes;
            stage.ActualCost = actualCost;
            stage.UpdatedAt = now;

            await _treatmentPlanRepository.SaveChangesAsync(cancellationToken);
            return ToProgressResponse(plan);
        }

        private static void ApplyNextStageDate(
            TreatmentPlan plan,
            TreatmentPlanStage currentStage,
            DateOnly nextDate,
            DateTimeOffset now)
        {
            var today = DateOnly.FromDateTime(ClinicClock.Now);
            var dateIsValid = nextDate >= today
                && (!currentStage.ScheduledDate.HasValue || nextDate >= currentStage.ScheduledDate.Value);
            ConditionGuard.Ensure(dateIsValid, ErrorConstants.TreatmentPlanMessage.ScheduledDateInvalid);

            var nextStage = plan.Stages
                .Where(s => s.StageNumber > currentStage.StageNumber
                    && s.StageStatus == TreatmentPlanConstants.StageStatus.Scheduled)
                .OrderBy(s => s.StageNumber)
                .FirstOrDefault();
            ConditionGuard.Ensure<NotFoundException>(nextStage != null, ErrorConstants.TreatmentPlanMessage.NextStageNotFound);

            nextStage!.ScheduledDate = nextDate;
            nextStage.UpdatedAt = now;
        }

        public async Task<TreatmentPlanProgressResponse> CompleteStageAsync(
            long treatmentPlanId,
            long stageId,
            CompleteTreatmentStageRequest? request,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetTrackedByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);
            var doctor = await EnsureAccessAsync(userId, plan!);

            var stage = plan!.Stages.FirstOrDefault(s => s.Id == stageId);
            ConditionGuard.Ensure<NotFoundException>(stage != null, ErrorConstants.TreatmentPlanMessage.StageNotFound);

            ConditionGuard.Ensure(
                plan.Status == TreatmentPlanConstants.InProgress,
                ErrorConstants.TreatmentPlanMessage.PlanNotInProgress);
            ConditionGuard.Ensure(
                stage!.StageStatus == TreatmentPlanConstants.StageStatus.InProgress,
                ErrorConstants.TreatmentPlanMessage.StageNotInProgress);

            var notes = stage.Notes;
            if (request?.Notes != null)
            {
                notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
            }

            var actualCost = stage.ActualCost;
            if (request?.ActualCost != null)
            {
                ConditionGuard.Ensure(
                    request.ActualCost.Value >= 0,
                    ErrorConstants.TreatmentPlanMessage.InvalidActualCost);
                actualCost = request.ActualCost;
            }

            var costDiffers = actualCost.HasValue && actualCost.Value != stage.EstimatedCost;
            ConditionGuard.ThrowIf(
                costDiffers && string.IsNullOrWhiteSpace(notes),
                ErrorConstants.TreatmentPlanMessage.NotesRequiredWhenCostDiffers);

            var now = DateTimeOffset.UtcNow;
            stage.Notes = notes;
            stage.ActualCost = actualCost;
            stage.StageStatus = TreatmentPlanConstants.StageStatus.Completed;
            stage.ActualDate = DateOnly.FromDateTime(ClinicClock.Now);
            stage.CompletedAt = now;
            stage.PerformedByDoctorId = doctor.Id;
            stage.UpdatedAt = now;

            var hasOpenStage = plan.Stages.Any(s =>
                s.StageStatus != TreatmentPlanConstants.StageStatus.Completed
                && s.StageStatus != TreatmentPlanConstants.StageStatus.Cancelled);
            if (!hasOpenStage)
            {
                plan.Status = TreatmentPlanConstants.Completed;
                plan.UpdatedAt = now;
            }

            await _treatmentPlanRepository.SaveChangesAsync(cancellationToken);
            return ToProgressResponse(plan);
        }

        private sealed record ValidStage(CreateTreatmentPlanStageRequest Request, Service Service, decimal Cost);

        // Checks every stage before anything changes: services exist and are active, costs are not negative,
        // dates are not in the past and do not go back before an earlier stage
        private async Task<List<ValidStage>> ValidateStagesAsync(
            IReadOnlyList<CreateTreatmentPlanStageRequest>? stageRequests,
            CancellationToken cancellationToken)
        {
            ConditionGuard.Ensure(stageRequests != null && stageRequests.Count > 0, ErrorConstants.TreatmentPlanMessage.StagesRequired);
            ConditionGuard.Ensure<NotFoundException>(stageRequests!.All(s => s.ServiceId.HasValue), ErrorConstants.AppointmentMessage.ServiceNotFound);

            var services = (await _serviceRepository.GetByIdsAsync(stageRequests.Select(s => s.ServiceId!.Value), cancellationToken))
                .ToDictionary(s => s.Id);

            var today = DateOnly.FromDateTime(ClinicClock.Now);
            DateOnly? previousDate = null;
            var validStages = new List<ValidStage>();
            foreach (var stageRequest in stageRequests)
            {
                ConditionGuard.Ensure<NotFoundException>(services.TryGetValue(stageRequest.ServiceId!.Value, out var service),
                    ErrorConstants.AppointmentMessage.ServiceNotFound);
                ConditionGuard.Ensure(service!.IsActive, ErrorConstants.AppointmentMessage.ServiceInactive);

                // A cost left out takes the price list; the doctor may set another one for this patient
                var cost = stageRequest.EstimatedCost ?? service.ReferencePrice;
                ConditionGuard.Ensure(cost >= 0, ErrorConstants.TreatmentPlanMessage.InvalidEstimatedCost);

                var date = stageRequest.ScheduledDate;
                if (date.HasValue)
                {
                    ConditionGuard.Ensure(date.Value >= today && (!previousDate.HasValue || date.Value >= previousDate.Value),
                        ErrorConstants.TreatmentPlanMessage.ScheduledDateInvalid);
                    previousDate = date;
                }

                validStages.Add(new ValidStage(stageRequest, service, cost));
            }

            return validStages;
        }

        private static void ApplyStage(TreatmentPlanStage stage, ValidStage validStage, int stageNumber)
        {
            stage.StageNumber = stageNumber;
            stage.StageName = Clean(validStage.Request.StageName) ?? validStage.Service.ServiceName;
            stage.Description = Clean(validStage.Request.Description);
            stage.ServiceId = validStage.Service.Id;
            stage.EstimatedCost = validStage.Cost;
            stage.ScheduledDate = validStage.Request.ScheduledDate;
        }

        // Totals are worked out by the server, never taken from the client
        private static void SetTotals(TreatmentPlan plan)
        {
            plan.TotalStages = plan.Stages.Count;
            plan.EstimatedTotalCost = plan.Stages.Sum(s => s.EstimatedCost);
        }

        private static string? Clean(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static TreatmentPlanProgressResponse ToProgressResponse(TreatmentPlan plan)
        {
            var stages = plan.Stages
                .OrderBy(s => s.StageNumber)
                .ToList();

            var completedStages = stages.Count(s =>
                s.StageStatus == TreatmentPlanConstants.StageStatus.Completed);
            var cancelledStages = stages.Count(s =>
                s.StageStatus == TreatmentPlanConstants.StageStatus.Cancelled);
            var nonCancelledCount = stages.Count - cancelledStages;

            var nextStage = stages.FirstOrDefault(s =>
                s.StageStatus == TreatmentPlanConstants.StageStatus.InProgress
                || s.StageStatus == TreatmentPlanConstants.StageStatus.Scheduled);
            var completedCost = stages
                .Where(s => s.StageStatus == TreatmentPlanConstants.StageStatus.Completed)
                .Sum(s => s.ActualCost ?? s.EstimatedCost);

            return new TreatmentPlanProgressResponse
            {
                TreatmentPlanId = plan.Id,
                PlanName = plan.PlanName,
                Status = plan.Status,
                PlanVersion = plan.PlanVersion,
                Description = plan.Description,
                ExaminationId = plan.ExaminationId,
                PatientId = plan.PatientId,
                PatientName = plan.Patient?.FullName,
                CreatedByDoctorId = plan.CreatedByDoctorId,
                CreatedByDoctorName = plan.CreatedByDoctor?.FullName,
                EstimatedTotalCost = plan.EstimatedTotalCost,
                CompletedCost = completedCost,
                CreatedAt = plan.CreatedAt,
                ApprovedAt = plan.ApprovedAt,
                CancellationReason = plan.CancellationReason,
                CancelledAt = plan.CancelledAt,
                TotalStages = stages.Count,
                CompletedStages = completedStages,
                CancelledStages = cancelledStages,
                ProgressPercent = ProgressPercent(completedStages, nonCancelledCount),
                NextStage = nextStage == null ? null : ToStageResponse(nextStage),
                Stages = stages.Select(ToStageResponse).ToList()
            };
        }

        // BR-134: completed / stages that are not cancelled
        private static decimal ProgressPercent(int completedStages, int nonCancelledCount)
        {
            return nonCancelledCount == 0
                ? 0m
                : Math.Round((decimal)completedStages / nonCancelledCount * 100m, 2);
        }

        private static TreatmentPlanStageResponse ToStageResponse(TreatmentPlanStage stage)
        {
            return new TreatmentPlanStageResponse
            {
                Id = stage.Id,
                StageNumber = stage.StageNumber,
                StageName = stage.StageName,
                Description = stage.Description,
                ServiceId = stage.ServiceId,
                ServiceName = stage.Service?.ServiceName,
                EstimatedCost = stage.EstimatedCost,
                ActualCost = stage.ActualCost,
                StageStatus = stage.StageStatus,
                ScheduledDate = stage.ScheduledDate,
                ActualDate = stage.ActualDate,
                PerformedByDoctorId = stage.PerformedByDoctorId,
                Notes = stage.Notes,
                CompletedAt = stage.CompletedAt
            };
        }
    }
}
