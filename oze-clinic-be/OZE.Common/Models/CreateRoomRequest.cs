using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CreateRoomRequest
    {
        [Required(ErrorMessage = "Room name is required")]
        [MaxLength(100, ErrorMessage ="Room name must not excced 100 characters")]
        public string RoomName { get; set; } = string.Empty;
        [Required(ErrorMessage = "Room type is required")]
        public string RoomType { get; set; } = string.Empty;
        [MaxLength(20, ErrorMessage = "Floor  must not excced 20 characters")]
        public string? Floor { get; set; }
        [MaxLength(500, ErrorMessage = "Description  must not excced 500 characters")]

        public string? Description { get; set; }
    }
}
