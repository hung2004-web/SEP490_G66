using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class UserRefreshTokenDTO
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public string RefreshToken { get; set; } = string.Empty;

        [Required]
        public DateTime ExpiryDate { get; set; }

        [Required]
        public DateTime CreationDate { get; set; } = DateTime.UtcNow;

        public string? AccessToken { get; set; }

        public DateTime? RevokeAt { get; set; }
    }
}
