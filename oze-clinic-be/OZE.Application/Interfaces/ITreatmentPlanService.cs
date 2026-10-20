using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface ITreatmentPlanService
    {
        Task<TreatmentPlanProgressResponse> GetProgressAsync(long treatmentPlanId, CancellationToken cancellationToken = default);
    }
}
