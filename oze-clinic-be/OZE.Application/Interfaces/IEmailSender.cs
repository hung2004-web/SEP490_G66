using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IEmailSender
    {
        Task SendEmailAsync(string toEmail, string subject, string message);
        Task SendEmailVerificationAsync(ApplicationUser user, string callbackUrl);
    }
}
