using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IEmailSender
    {
        Task SendEmailAsync(string toEmail, string subject, string message);
        Task SendEmailVerificationAsync(ApplicationUser user, string callbackUrl);

        Task SendTemporaryPasswordAsync(ApplicationUser user, string temporaryPassword);
        Task SendRegistrationOtpAsync(string toEmail, string fullName, string otp, int expiresInMinutes);
    }
}
