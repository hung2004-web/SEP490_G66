using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IPendingProfileUpdateStore
    {
        void Save(PendingProfileUpdate update, TimeSpan timeToLive);
        PendingProfileUpdate? Get(string sessionId);
        void Remove(string sessionId);
    }
}
