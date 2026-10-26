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

        public TreatmentPlanService(
            ITreatmentPlanRepository treatmentPlanRepository,
            IStaffRepository staffRepository)
        {
            _treatmentPlanRepository = treatmentPlanRepository;
            _staffRepository = staffRepository;
        }

        public async Task<TreatmentPlanProgressResponse> GetProgressAsync(
            long treatmentPlanId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);

            return ToProgressResponse(plan!);
        }

        public async Task<TreatmentPlanProgressResponse> StartStageAsync(
            long treatmentPlanId,
            long stageId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetTrackedByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);

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
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetTrackedByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);

            var stage = plan!.Stages.FirstOrDefault(s => s.Id == stageId);
            ConditionGuard.Ensure<NotFoundException>(stage != null, ErrorConstants.TreatmentPlanMessage.StageNotFound);

            ConditionGuard.Ensure(
                stage!.StageStatus == TreatmentPlanConstants.StageStatus.InProgress,
                ErrorConstants.TreatmentPlanMessage.StageNotInProgress);

            var notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

            if (request.ActualCost.HasValue)
            {
                ConditionGuard.Ensure(
                    request.ActualCost.Value >= 0,
                    ErrorConstants.TreatmentPlanMessage.InvalidActualCost);

                var costDiffers = request.ActualCost.Value != stage.EstimatedCost;
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
            stage.ActualCost = request.ActualCost;
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
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
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

            var stage = plan!.Stages.FirstOrDefault(s => s.Id == stageId);
            ConditionGuard.Ensure<NotFoundException>(stage != null, ErrorConstants.TreatmentPlanMessage.StageNotFound);

            ConditionGuard.Ensure(
                plan.Status == TreatmentPlanConstants.InProgress,
                ErrorConstants.TreatmentPlanMessage.PlanNotInProgress);
            ConditionGuard.Ensure(
                stage!.StageStatus == TreatmentPlanConstants.StageStatus.InProgress,
                ErrorConstants.TreatmentPlanMessage.StageNotInProgress);

            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.DoctorScheduleMessage.DoctorNotFound);

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
            stage.ActualDate = DateOnly.FromDateTime(DateTime.UtcNow);
            stage.CompletedAt = now;
            stage.PerformedByDoctorId = doctor!.Id;
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

            // BR-134: completed / stages that are not cancelled
            var progressPercent = nonCancelledCount == 0
                ? 0m
                : Math.Round((decimal)completedStages / nonCancelledCount * 100m, 2);

            return new TreatmentPlanProgressResponse
            {
                TreatmentPlanId = plan.Id,
                PlanName = plan.PlanName,
                Status = plan.Status,
                PlanVersion = plan.PlanVersion,
                TotalStages = stages.Count,
                CompletedStages = completedStages,
                CancelledStages = cancelledStages,
                ProgressPercent = progressPercent,
                Stages = stages.Select(ToStageResponse).ToList()
            };
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
