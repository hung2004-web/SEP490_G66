using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface ITreatmentPlanService
    {
        Task<TreatmentPlanProgressResponse> GetProgressAsync(long treatmentPlanId,
            string userId, CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> StartStageAsync(long treatmentPlanId, long stageId,
            string userId, CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> UpdateStageAsync(long treatmentPlanId, long stageId, UpdateTreatmentStageRequest request,
            string userId, CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> CompleteStageAsync(long treatmentPlanId, long stageId, CompleteTreatmentStageRequest? request, string userId, CancellationToken cancellationToken = default);
    }
}
