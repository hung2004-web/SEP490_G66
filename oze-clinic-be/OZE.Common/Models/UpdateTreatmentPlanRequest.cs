using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // The whole draft as it should be: stages are renumbered in the order sent
    public class UpdateTreatmentPlanRequest
    {
        [Required]
        [MaxLength(200)]
        public string PlanName { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        [MinLength(1)]
        public List<UpdateTreatmentPlanStageRequest> Stages { get; set; } = new();
    }

    public class UpdateTreatmentPlanStageRequest : CreateTreatmentPlanStageRequest
    {
        // Set for a stage that is kept; left out for a new one. A stage of the plan that is not sent is removed
        public long? Id { get; set; }
    }
}
