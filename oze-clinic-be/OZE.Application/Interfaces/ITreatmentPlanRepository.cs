using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface ITreatmentPlanRepository
    {
        Task<TreatmentPlan?> GetByIdWithStagesAsync(long id, CancellationToken cancellationToken = default);
        Task<TreatmentPlan?> GetTrackedByIdWithStagesAsync(long id, CancellationToken cancellationToken = default);
        Task<Examination?> GetExaminationAsync(long examinationId, CancellationToken cancellationToken = default);
        Task<bool> HasOpenPlanAsync(long examinationId, CancellationToken cancellationToken = default);
        Task AddAsync(TreatmentPlan plan, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
