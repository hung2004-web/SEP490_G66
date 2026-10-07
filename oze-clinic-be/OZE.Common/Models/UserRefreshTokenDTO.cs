using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class UserRefreshTokenDTO
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public string RefreshToken { get; set; } = string.Empty;

        [Required]
        public DateTimeOffset ExpiryDate { get; set; }

        [Required]
        public DateTimeOffset CreatedAt { get; set; }

        public DateTimeOffset? RevokedAt { get; set; }
    }
}
