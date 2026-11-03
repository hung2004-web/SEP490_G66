namespace OZE.Application.Interfaces
{
    // Counts the codes sent to one phone number or email
    public interface IOtpSendLimiter
    {
        // Throws TooManyRequestsException when the contact already got the most codes allowed in the window;
        // otherwise counts this send
        void EnsureCanSend(string purpose, string contact);
    }
}
