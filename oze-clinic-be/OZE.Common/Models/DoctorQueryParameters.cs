using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class DoctorQueryParameters : PagedRequestBase
    {
        public string? Specialization { get; set; }
    }
}
