using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class UserRefreshTokenRepository : IUserRefreshTokenRepository
    {
        private readonly AppIdentityDbContext _context;

        public UserRefreshTokenRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<UserRefreshToken?> GetByTokenAsync(string refreshToken)
        {
            return await _context.UserRefreshTokens
                .FirstOrDefaultAsync(x => x.RefreshToken == refreshToken);
        }

        public async Task<UserRefreshToken?> GetActiveTokenAsync(string refreshToken)
        {
            return await _context.UserRefreshTokens
                .FirstOrDefaultAsync(x => x.RefreshToken == refreshToken && x.RevokedAt == null && x.ExpiryDate > DateTimeOffset.UtcNow);
        }

        public async Task AddAsync(UserRefreshToken refreshToken)
        {
            await _context.UserRefreshTokens.AddAsync(refreshToken);
        }

        public Task UpdateAsync(UserRefreshToken refreshToken)
        {
            _context.UserRefreshTokens.Update(refreshToken);
            return Task.CompletedTask;
        }

        public async Task RevokeUserTokensAsync(string userId)
        {
            var activeTokens = await _context.UserRefreshTokens
                .Where(x => x.UserId == userId && x.RevokedAt == null)
                .ToListAsync();

            var now = DateTimeOffset.UtcNow;
            foreach (var token in activeTokens)
            {
                token.RevokedAt = now;
            }
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
