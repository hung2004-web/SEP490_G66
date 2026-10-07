using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IPendingRegistrationStore
    {
        void Save(PendingRegistration registration, TimeSpan timeToLive);
        PendingRegistration? Get(string sessionId);
        void Remove(string sessionId);
    }
}
