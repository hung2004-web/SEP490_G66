using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CreateInstallmentPlanRequest
    {
        [MaxLength(500)]
        public string? Notes { get; set; }

        [Required]
        [MinLength(1)]
        public List<CreateInstallmentPeriodRequest> Periods { get; set; } = new();
    }

    public class CreateInstallmentPeriodRequest
    {
        [Range(1, int.MaxValue)]
        public int Sequence { get; set; }

        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [Required]
        public DateOnly DueDate { get; set; }
    }

    public class InstallmentPlanResponse
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string? CreatedByUserId { get; set; }
        public decimal PeriodsTotalAmount { get; set; }
        public List<InstallmentPeriodResponse> Periods { get; set; } = new();
    }

    public class InstallmentPeriodResponse
    {
        public long Id { get; set; }
        public long InstallmentPlanId { get; set; }
        public long InvoiceId { get; set; }
        public int Sequence { get; set; }
        public decimal Amount { get; set; }
        public DateOnly DueDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTimeOffset? PaidAt { get; set; }
        public long? PaymentId { get; set; }
        public string? InvoiceNumber { get; set; }
        public int? PatientId { get; set; }
        public string? PatientName { get; set; }
    }
}
