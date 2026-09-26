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
        Task SaveChangesAsync();
    }
}
