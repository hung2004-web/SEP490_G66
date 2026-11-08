using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class CreateRoomRequest
    {
        [Required(ErrorMessage = "Room name is required")]
        [MaxLength(100, ErrorMessage = "Room name must not exceed 100 characters")]
        public string RoomName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Room type is required")]
        [AllowedValues(RoomTypeConstants.GeneralTreatment, RoomTypeConstants.MinorSurgery, RoomTypeConstants.XRay,
            ErrorMessage = ErrorConstants.RoomMessage.InvalidRoomType)]
        public string RoomType { get; set; } = string.Empty;

        [MaxLength(20, ErrorMessage = "Floor must not exceed 20 characters")]
        public string? Floor { get; set; }

        [MaxLength(500, ErrorMessage = "Description must not exceed 500 characters")]
        public string? Description { get; set; }
    }
}
