using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IExaminationRepository
    {
        // Tracked, with the appointment's services and the diagnoses, so changes are saved together
        Task<Examination?> GetForWorkAsync(long examinationId, CancellationToken cancellationToken = default);
        // The chart entries the patient got in earlier examinations (before the given time), to know how each tooth was before this one
        Task<List<DentalChartEntry>> GetEarlierChartEntriesAsync(int patientId, DateTimeOffset before, long excludeExaminationId, CancellationToken cancellationToken = default);
        void RemoveChartEntry(DentalChartEntry entry);
        Task<Service?> GetServiceAsync(int serviceId, CancellationToken cancellationToken = default);
        Task<ServiceVariant?> GetVariantAsync(int variantId, CancellationToken cancellationToken = default);
        Task<string?> GetConfigValueAsync(string configKey);
        void RemoveServiceItem(AppointmentServiceItem item);
        void RemoveDiagnosis(ClinicalDiagnosis diagnosis);
        void RemovePrescriptionItem(PrescriptionItem item);
        // Removes the prescription together with all of its medications
        void RemovePrescription(Prescription prescription);
        Task<Examination?> GetByIdWithFollowUpAsync(long examinationId, CancellationToken cancellationToken = default);
        Task<PagedResult<Examination>> GetFollowUpsAsync(FollowUpQueryParameters parameters, CancellationToken cancellationToken = default);
        Task AddNotificationAsync(Notification notification, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
