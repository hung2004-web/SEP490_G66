using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IUserRefreshTokenRepository
    {
        Task<UserRefreshToken?> GetByTokenAsync(string refreshToken);
        Task<UserRefreshToken?> GetActiveTokenAsync(string refreshToken);
        Task AddAsync(UserRefreshToken refreshToken);
        Task UpdateAsync(UserRefreshToken refreshToken);
        Task RevokeUserTokensAsync(string userId);
        /// <summary>Revokes every active refresh token for the user except <paramref name="keepRefreshToken"/>.</summary>
        Task RevokeUserTokensExceptAsync(string userId, string keepRefreshToken);
        Task SaveChangesAsync();
    }
}
