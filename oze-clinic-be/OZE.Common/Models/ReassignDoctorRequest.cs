using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class ReassignDoctorRequest
    {
        // The doctor who takes over the waiting patient
        [Required]
        public int? DoctorId { get; set; }
    }
}
