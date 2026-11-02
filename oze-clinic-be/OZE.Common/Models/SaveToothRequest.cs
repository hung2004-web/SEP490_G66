using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // The state of one tooth as the doctor finds it in this examination
    public class SaveToothRequest
    {
        // Healthy, Caries, Filled, Crown, Missing, Denture or Implant
        [Required]
        public string? Condition { get; set; }

        // Optional part of the tooth, for example O, M, D
        public string? Surface { get; set; }

        public string? Severity { get; set; }

        public string? Notes { get; set; }
    }
}
