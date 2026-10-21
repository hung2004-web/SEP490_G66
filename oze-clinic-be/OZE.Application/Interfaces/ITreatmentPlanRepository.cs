using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface ITreatmentPlanRepository
    {
        Task<TreatmentPlan?> GetByIdWithStagesAsync(long id, CancellationToken cancellationToken = default);
        Task<TreatmentPlan?> GetTrackedByIdWithStagesAsync(long id, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
