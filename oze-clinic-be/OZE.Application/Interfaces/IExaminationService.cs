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
        Task<List<ExaminationServiceResponse>> AddServiceAsync(string userId, long examinationId, AddExaminationServiceRequest request, CancellationToken cancellationToken = default);
        Task<List<ExaminationServiceResponse>> RemoveServiceAsync(string userId, long examinationId, long serviceItemId, CancellationToken cancellationToken = default);

        // Each call returns the diagnoses of the examination as they are now, so a changed primary one is visible
        Task<List<DiagnosisResponse>> AddDiagnosisAsync(string userId, long examinationId, SaveDiagnosisRequest request, CancellationToken cancellationToken = default);
        Task<List<DiagnosisResponse>> UpdateDiagnosisAsync(string userId, long examinationId, long diagnosisId, SaveDiagnosisRequest request, CancellationToken cancellationToken = default);
        Task<List<DiagnosisResponse>> DeleteDiagnosisAsync(string userId, long examinationId, long diagnosisId, CancellationToken cancellationToken = default);
    }
}
