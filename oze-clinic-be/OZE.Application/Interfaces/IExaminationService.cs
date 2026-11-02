using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    // What the examining doctor reads and writes while the examination is in progress
    public interface IExaminationService
    {
        Task<ExaminationWorkResponse> GetAsync(string userId, long examinationId, CancellationToken cancellationToken = default);

        // Reason for the visit (the patient's booking note) and the doctor's clinical notes
        Task<ExaminationWorkResponse> UpdateContentAsync(string userId, long examinationId, UpdateExaminationContentRequest request, CancellationToken cancellationToken = default);

        // Services of the appointment: all of them are listed, the doctor can add one after consulting the patient or remove one
        Task<List<ExaminationServiceResponse>> AddServiceAsync(string userId, long examinationId, SaveExaminationServiceRequest request, CancellationToken cancellationToken = default);
        // Changes a service of the appointment into another service or variant, price and time follow the catalog
        Task<List<ExaminationServiceResponse>> UpdateServiceAsync(string userId, long examinationId, long serviceItemId, SaveExaminationServiceRequest request, CancellationToken cancellationToken = default);
        Task<List<ExaminationServiceResponse>> RemoveServiceAsync(string userId, long examinationId, long serviceItemId, CancellationToken cancellationToken = default);

        // Dental chart: the doctor records how a tooth is, the chart is the latest state of each tooth
        Task<List<DentalChartToothResponse>> GetDentalChartAsync(string userId, long examinationId, CancellationToken cancellationToken = default);
        Task<List<DentalChartToothResponse>> SetToothAsync(string userId, long examinationId, string toothNumber, SaveToothRequest request, CancellationToken cancellationToken = default);
        Task<List<DentalChartToothResponse>> RemoveToothChangeAsync(string userId, long examinationId, string toothNumber, CancellationToken cancellationToken = default);

        // Prescription: one per examination, made of medications. Finalizing locks it for changes until it is reopened.
        Task<PrescriptionResponse> GetPrescriptionAsync(string userId, long examinationId, CancellationToken cancellationToken = default);
        Task<PrescriptionResponse> SavePrescriptionNotesAsync(string userId, long examinationId, SavePrescriptionNotesRequest request, CancellationToken cancellationToken = default);
        Task<PrescriptionResponse> AddPrescriptionItemAsync(string userId, long examinationId, SavePrescriptionItemRequest request, CancellationToken cancellationToken = default);
        Task<PrescriptionResponse> UpdatePrescriptionItemAsync(string userId, long examinationId, long itemId, SavePrescriptionItemRequest request, CancellationToken cancellationToken = default);
        Task<PrescriptionResponse> DeletePrescriptionItemAsync(string userId, long examinationId, long itemId, CancellationToken cancellationToken = default);
        Task<PrescriptionResponse> FinalizePrescriptionAsync(string userId, long examinationId, CancellationToken cancellationToken = default);
        Task<PrescriptionResponse> ReopenPrescriptionAsync(string userId, long examinationId, CancellationToken cancellationToken = default);

        // Each call returns the diagnoses of the examination as they are now, so a changed primary one is visible
        Task<List<DiagnosisResponse>> AddDiagnosisAsync(string userId, long examinationId, SaveDiagnosisRequest request, CancellationToken cancellationToken = default);
        Task<List<DiagnosisResponse>> UpdateDiagnosisAsync(string userId, long examinationId, long diagnosisId, SaveDiagnosisRequest request, CancellationToken cancellationToken = default);
        Task<List<DiagnosisResponse>> DeleteDiagnosisAsync(string userId, long examinationId, long diagnosisId, CancellationToken cancellationToken = default);
    }
}
