using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface ITreatmentPlanService
    {
        Task<TreatmentPlanProgressResponse> CreateAsync(long examinationId, CreateTreatmentPlanRequest request,
            string userId, CancellationToken cancellationToken = default);
        // canViewAll: reception sees every patient; a doctor only the patients they examine
        Task<TreatmentPlanProgressResponse> GetDetailAsync(long treatmentPlanId, string userId, bool canViewAll,
            CancellationToken cancellationToken = default);
        Task<List<TreatmentPlanSummaryResponse>> GetByPatientAsync(int patientId, bool includeClosed, string userId, bool canViewAll,
            CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> UpdateAsync(long treatmentPlanId, UpdateTreatmentPlanRequest request,
            string userId, CancellationToken cancellationToken = default);
        Task DeleteAsync(long treatmentPlanId, string userId, CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> GetProgressAsync(long treatmentPlanId,
            string userId, CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> StartStageAsync(long treatmentPlanId, long stageId,
            string userId, CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> UpdateStageAsync(long treatmentPlanId, long stageId, UpdateTreatmentStageRequest request,
            string userId, CancellationToken cancellationToken = default);
        Task<TreatmentPlanProgressResponse> CompleteStageAsync(long treatmentPlanId, long stageId, CompleteTreatmentStageRequest? request, string userId, CancellationToken cancellationToken = default);
    }
}
