using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class CreateRoleRequest
    {
        // A comma is not allowed: [Authorize(Roles = "...")] uses it to separate role names.
        [Required(ErrorMessage = ErrorConstants.RoleMessage.NameRequired)]
        [MaxLength(100, ErrorMessage = ErrorConstants.RoleMessage.NameInvalid)]
        [RegularExpression(@"^[\p{L}\p{N} _-]+$", ErrorMessage = ErrorConstants.RoleMessage.NameInvalid)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500, ErrorMessage = ErrorConstants.RoleMessage.DescriptionInvalid)]
        public string? Description { get; set; }
    }
}
