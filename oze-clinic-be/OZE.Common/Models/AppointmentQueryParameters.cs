using System;
using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class AppointmentQueryParameters : PagedRequestBase
    {
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
        public DateOnly? Date { get; set; }
        public int? DoctorId { get; set; }
        public int? PatientId { get; set; }
        public string? Status { get; set; }
    }
}
