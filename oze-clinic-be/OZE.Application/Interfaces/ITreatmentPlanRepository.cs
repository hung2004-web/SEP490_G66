using OZE.Common.Models;
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
        Task<bool> PatientExistsAsync(int patientId, CancellationToken cancellationToken = default);
        Task<List<TreatmentPlanSummaryResponse>> GetByPatientAsync(int patientId, bool includeClosed, CancellationToken cancellationToken = default);
        Task<bool> IsInvoicedAsync(long treatmentPlanId, CancellationToken cancellationToken = default);
        void Remove(TreatmentPlan plan);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
