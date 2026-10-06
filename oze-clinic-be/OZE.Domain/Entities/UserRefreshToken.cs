namespace OZE.Domain.Entities
{
    public class UserRefreshToken
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTimeOffset ExpiryDate { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? RevokedAt { get; set; }

        public virtual ApplicationUser? User { get; set; }

        public bool IsExpired => DateTimeOffset.UtcNow >= ExpiryDate;
        public bool IsRevoked => RevokedAt.HasValue;
        public bool IsActive => !IsRevoked && !IsExpired;
    }
}
