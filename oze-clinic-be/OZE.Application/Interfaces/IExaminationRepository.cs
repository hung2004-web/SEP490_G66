using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IExaminationRepository
    {
        // Tracked, with the appointment's services and the diagnoses, so changes are saved together
        Task<Examination?> GetForWorkAsync(long examinationId, CancellationToken cancellationToken = default);
        Task<Service?> GetServiceAsync(int serviceId, CancellationToken cancellationToken = default);
        Task<ServiceVariant?> GetVariantAsync(int variantId, CancellationToken cancellationToken = default);
        Task<string?> GetConfigValueAsync(string configKey);
        void RemoveServiceItem(AppointmentServiceItem item);
        void RemoveDiagnosis(ClinicalDiagnosis diagnosis);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
