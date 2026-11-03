using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace OZE.Controllers
{
    [ApiController]
    [Route("api/webhooks")]
    public class WebhooksController : ControllerBase
    {
        private readonly IImagingRequestService _imagingRequestService;
        private readonly IConfiguration _configuration;
        private readonly IHostEnvironment _environment;
        private readonly ILogger<WebhooksController> _logger;

        public WebhooksController(
            IImagingRequestService imagingRequestService,
            IConfiguration configuration,
            IHostEnvironment environment,
            ILogger<WebhooksController> logger)
        {
            _imagingRequestService = imagingRequestService;
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
        }

        /// <summary>
        /// Webhook receiver endpoint for X-ray Simulator Service.
        /// Processes capture session completion events, saves imaging results,
        /// marks the imaging request as Completed, and places the patient into the Priority Return Queue.
        /// Every call must carry a valid HMAC SHA256 signature of the body.
        /// </summary>
        [HttpPost("imaging-simulator")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveImagingSimulatorWebhook(
            [FromHeader(Name = "X-Sim-Signature")] string? signature,
            [FromHeader(Name = "X-Sim-Event-Id")] string? eventId,
            CancellationToken cancellationToken)
        {
            var sharedSecret = _configuration[ImagingRequestConstants.WebhookSecretConfigKey];
            if (string.IsNullOrWhiteSpace(sharedSecret) && _environment.IsDevelopment())
            {
                sharedSecret = ImagingRequestConstants.DevelopmentWebhookSecret;
            }

            if (string.IsNullOrWhiteSpace(sharedSecret))
            {
                _logger.LogError("The webhook secret {ConfigKey} is not configured, webhook event {EventId} refused", ImagingRequestConstants.WebhookSecretConfigKey, eventId);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.FailureResult(ErrorConstants.ImagingRequestMessage.WebhookSecretNotConfigured));
            }

            if (string.IsNullOrWhiteSpace(signature))
            {
                _logger.LogWarning("Webhook event {EventId} refused: no signature", eventId);
                return Unauthorized(ApiResponse.FailureResult(ErrorConstants.ImagingRequestMessage.WebhookSignatureMissing));
            }

            // Read raw body for HMAC SHA256 verification
            using var reader = new StreamReader(Request.Body, Encoding.UTF8);
            var rawBody = await reader.ReadToEndAsync(cancellationToken);

            var providedSignature = signature.StartsWith(ImagingRequestConstants.WebhookSignaturePrefix, StringComparison.OrdinalIgnoreCase)
                ? signature.Substring(ImagingRequestConstants.WebhookSignaturePrefix.Length)
                : signature;
            if (!IsValidSignature(rawBody, sharedSecret, providedSignature))
            {
                _logger.LogWarning("Invalid webhook signature for event {EventId}", eventId);
                return Unauthorized(ApiResponse.FailureResult(ErrorConstants.ImagingRequestMessage.WebhookSignatureInvalid));
            }

            ImagingSimulatorWebhookPayload? payload;
            try
            {
                payload = JsonSerializer.Deserialize<ImagingSimulatorWebhookPayload>(rawBody, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (JsonException)
            {
                payload = null;
            }

            if (payload == null)
            {
                return BadRequest(ApiResponse.FailureResult(ErrorConstants.ImagingRequestMessage.WebhookPayloadInvalid));
            }

            _logger.LogInformation("Processing simulator webhook event {EventId} for OrderReference {OrderRef}, State {State}",
                payload.EventId, payload.OrderReference, payload.State);

            var processed = await _imagingRequestService.ProcessSimulatorWebhookAsync(payload, cancellationToken);
            if (!processed)
            {
                return BadRequest(ApiResponse.FailureResult("Failed to process imaging request completion from webhook"));
            }

            return Ok(ApiResponse.SuccessResult("Webhook processed successfully. Patient added to Priority Return Queue."));
        }

        private static bool IsValidSignature(string data, string secret, string providedSignature)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var expected = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));

            byte[] provided;
            try
            {
                provided = Convert.FromHexString(providedSignature);
            }
            catch (FormatException)
            {
                return false;
            }

            // Constant-time comparison, so the response time does not give the signature away
            return CryptographicOperations.FixedTimeEquals(expected, provided);
        }
    }
}
