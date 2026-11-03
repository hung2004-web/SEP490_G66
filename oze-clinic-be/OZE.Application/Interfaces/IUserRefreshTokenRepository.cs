using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IUserRefreshTokenRepository
    {
        Task<UserRefreshToken?> GetByTokenAsync(string refreshToken);
        Task<UserRefreshToken?> GetActiveTokenAsync(string refreshToken);
        // Revokes the token only if it is still active; false when another call revoked it first
        Task<bool> TryRevokeAsync(Guid id, DateTimeOffset revokedAt);
        Task AddAsync(UserRefreshToken refreshToken);
        Task UpdateAsync(UserRefreshToken refreshToken);
        Task RevokeUserTokensAsync(string userId);
        Task SaveChangesAsync();
    }
}
