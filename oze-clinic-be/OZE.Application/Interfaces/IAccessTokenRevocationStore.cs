namespace OZE.Application.Interfaces
{
    // Access tokens ended before they expire (logout), by their id (jti)
    public interface IAccessTokenRevocationStore
    {
        void Revoke(string tokenId, DateTimeOffset expiresAt);
        bool IsRevoked(string tokenId);
    }
}
