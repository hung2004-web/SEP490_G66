using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class PatientQueryParameters : PagedRequestBase
    {
        public string? Gender { get; set; }
        public string? BloodType { get; set; }
    }
}
