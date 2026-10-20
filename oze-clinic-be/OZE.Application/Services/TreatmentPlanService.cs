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

        public TreatmentPlanService(ITreatmentPlanRepository treatmentPlanRepository)
        {
            _treatmentPlanRepository = treatmentPlanRepository;
        }

        public async Task<TreatmentPlanProgressResponse> GetProgressAsync(
            long treatmentPlanId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _treatmentPlanRepository.GetByIdWithStagesAsync(treatmentPlanId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.TreatmentPlanMessage.PlanNotFound);

            return ToProgressResponse(plan!);
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
