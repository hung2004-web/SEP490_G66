using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // Used to add a diagnosis and to change one
    public class SaveDiagnosisRequest
    {
        // ICD-10 code, optional
        public string? DiagnosisCode { get; set; }

        [Required]
        public string? DiagnosisName { get; set; }

        public string? Description { get; set; }

        // An examination has one primary diagnosis, choosing this one makes the others secondary
        public bool IsPrimary { get; set; }
    }
}
