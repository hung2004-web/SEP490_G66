using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // A draft plan made by the doctor during an examination; stages are numbered in the order they are sent
    public class CreateTreatmentPlanRequest
    {
        [Required]
        [MaxLength(200)]
        public string PlanName { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        [MinLength(1)]
        public List<CreateTreatmentPlanStageRequest> Stages { get; set; } = new();
    }

    public class CreateTreatmentPlanStageRequest
    {
        [Required]
        public int? ServiceId { get; set; }

        // Defaults to the service name when left out
        [MaxLength(200)]
        public string? StageName { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        // Defaults to the service reference price when left out
        public decimal? EstimatedCost { get; set; }

        public DateOnly? ScheduledDate { get; set; }
    }
}
