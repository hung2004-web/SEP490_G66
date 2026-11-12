using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class InvoiceQueryParameters : PagedRequestBase
    {
        public int? PatientId { get; set; }
        public long? AppointmentId { get; set; }
        public long? TreatmentPlanId { get; set; }
        public string? PaymentStatus { get; set; }
        // Clinic days (Vietnam time) of the invoice's creation, both inclusive
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
    }
}
