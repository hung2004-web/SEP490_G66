using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    // Only the description can be changed; the role name stays fixed so existing authorizations keep working.
    public class UpdateRoleRequest
    {
        [MaxLength(500, ErrorMessage = ErrorConstants.RoleMessage.DescriptionInvalid)]
        public string? Description { get; set; }
    }
}
