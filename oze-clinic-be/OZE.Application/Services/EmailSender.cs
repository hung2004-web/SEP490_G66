using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Domain.Entities;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace OZE.Application.Services
{
    public class EmailSender : IEmailSender
    {
        private readonly AuthMessageSenderOptions _options;
        private readonly ILogger<EmailSender> _logger;

        public EmailSender(
            IOptions<AuthMessageSenderOptions> optionsAccessor,
            ILogger<EmailSender> logger)
        {
            _options = optionsAccessor.Value;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string message)
        {
            if (string.IsNullOrWhiteSpace(_options.SendGridKey))
            {
                _logger.LogWarning("SendGridKey is not configured. Email to {ToEmail} with subject '{Subject}' was not sent via network. Body: {Message}",
                    toEmail, subject, message);
                return;
            }

            var client = new SendGridClient(_options.SendGridKey);
            var from = new EmailAddress(_options.SenderEmail, _options.SenderName);
            var to = new EmailAddress(toEmail);
            var msg = MailHelper.CreateSingleEmail(from, to, subject, plainTextContent: message, htmlContent: message);

            var response = await client.SendEmailAsync(msg);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("Failed to send email via SendGrid: {StatusCode}, {Body}", response.StatusCode, body);
                throw new Exception($"Email sending failed: {response.StatusCode}, {body}");
            }
        }

        public async Task SendEmailVerificationAsync(ApplicationUser user, string callbackUrl)
        {
            var fullName = user.Patient?.FullName ?? user.StaffProfile?.FullName;
            var greetingName = !string.IsNullOrWhiteSpace(fullName)
                ? fullName
                : (user.UserName ?? user.Email);
            var subject = "Verify your email address";
            var htmlMessage = $@"
                <p>Hello {greetingName},</p>
                <p>Thank you for registering. Please verify your email by clicking the link below:</p>
                <p><a href='{callbackUrl}'>Verify Email</a></p>
                <p>If you did not request this, please ignore this email.</p>";

            await SendEmailAsync(user.Email ?? string.Empty, subject, htmlMessage);
        }

        public  async Task SendTemporaryPasswordAsync(ApplicationUser user, string temporaryPassword)
        {

            var subject = "Your temporary password";
            var htmlMessage = $@"
            <p>Hello {user.UserName ?? user.Email},</p>
            <p>Your temporary password is: <b>{temporaryPassword}</b></p>
            <p>Please log in and change your password right away.</p>";

            await SendEmailAsync(user.Email ?? string.Empty, subject, htmlMessage);
        }

        public async Task SendRegistrationOtpAsync(string toEmail, string fullName, string otp, int expiresInMinutes)
        {
            var subject = "Your OZE verification code";
            var htmlMessage = $@"
            <p>Hello {fullName},</p>
            <p>Your verification code is: <b>{otp}</b></p>
            <p>The code is valid for {expiresInMinutes} minutes.</p>
            <p>If you did not request this, please ignore this email.</p>";

            await SendEmailAsync(toEmail, subject, htmlMessage);
        }
    }
}
