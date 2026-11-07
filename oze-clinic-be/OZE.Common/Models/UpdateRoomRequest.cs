using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class UpdateRoomRequest : CreateRoomRequest
    {
        [Required(ErrorMessage = "Room status is required")]
        public string Status { get; set; } = string.Empty;
    }
}
