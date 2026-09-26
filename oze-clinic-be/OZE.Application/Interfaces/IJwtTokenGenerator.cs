using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IJwtTokenGenerator
    {
        Task<string> GenerateTokenAsync(ApplicationUser user);
        string GenerateRefreshToken();
    }
}
