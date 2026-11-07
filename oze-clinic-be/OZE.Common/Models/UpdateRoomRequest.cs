using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class UpdateRoomRequest : CreateRoomRequest
    {
        [Required(ErrorMessage = "Room status is required")]
        [AllowedValues(RoomConstants.ActiveStatus, RoomConstants.MaintenanceStatus, RoomConstants.InactiveStatus,
            ErrorMessage = ErrorConstants.RoomMessage.InvalidStatus)]
        public string Status { get; set; } = string.Empty;
    }
}
