using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OZE.Domain.Entities
{
    public class UserRefreshToken
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser? User { get; set; }

        [Required]
        public string RefreshToken { get; set; } = string.Empty;

        [Required]
        public DateTime ExpiryDate { get; set; }

        [Required]
        public DateTime CreationDate { get; set; } = DateTime.UtcNow;

        public string? AccessToken { get; set; }

        public DateTime? RevokeAt { get; set; }

        public bool IsExpired => DateTime.UtcNow >= ExpiryDate;
        public bool IsRevoked => RevokeAt.HasValue;
        public bool IsActive => !IsRevoked && !IsExpired;
    }
}
