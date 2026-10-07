using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace OZE.Application.Services
{
    public class SmsSender : ISmsSender
    {
        private readonly AuthSmsSenderOptions _options;
        private readonly ILogger<SmsSender> _logger;

        public SmsSender(
            IOptions<AuthSmsSenderOptions> optionsAccessor,
            ILogger<SmsSender> logger)
        {
            _options = optionsAccessor.Value;
            _logger = logger;
        }

        public async Task SendSmsAsync(string toPhoneNumber, string message)
        {
            if (string.IsNullOrWhiteSpace(_options.AccountSid)
                || string.IsNullOrWhiteSpace(_options.AuthToken)
                || string.IsNullOrWhiteSpace(_options.FromNumber))
            {
                _logger.LogWarning(
                    "SMS is not configured. Message to {Phone} was not sent via network. Body: {Message}",
                    toPhoneNumber,
                    message);
                return;
            }

            TwilioClient.Init(_options.AccountSid, _options.AuthToken);

            var result = await MessageResource.CreateAsync(
                to: new PhoneNumber(toPhoneNumber),
                from: new PhoneNumber(_options.FromNumber),
                body: message);

            if (result.ErrorCode != null)
            {
                _logger.LogError(
                    "Failed to send SMS via Twilio: {ErrorCode} {ErrorMessage}",
                    result.ErrorCode,
                    result.ErrorMessage);
                throw new Exception($"SMS sending failed: {result.ErrorCode} {result.ErrorMessage}");
            }
        }
    }
}
