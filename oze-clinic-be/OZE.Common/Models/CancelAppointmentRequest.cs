using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CancelAppointmentRequest
    {
        [Required(ErrorMessage = "Lý do hủy không được để trống")]
        [MaxLength(500, ErrorMessage = "Lý do hủy không được vượt quá 500 ký tự")]
        public string Reason { get; set; } = string.Empty;
    }
}
