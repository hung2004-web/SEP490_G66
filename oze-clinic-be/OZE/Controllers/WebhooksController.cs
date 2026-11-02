using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
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
        private readonly ILogger<WebhooksController> _logger;

        public WebhooksController(
            IImagingRequestService imagingRequestService,
            IConfiguration configuration,
            ILogger<WebhooksController> logger)
        {
            _imagingRequestService = imagingRequestService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Webhook receiver endpoint for X-ray Simulator Service.
        /// Processes capture session completion events, saves imaging results,
        /// marks the imaging request as Completed, and places the patient into the Priority Return Queue.
        /// </summary>
        [HttpPost("imaging-simulator")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveImagingSimulatorWebhook(
            [FromHeader(Name = "X-Sim-Signature")] string? signature,
            [FromHeader(Name = "X-Sim-Event-Id")] string? eventId,
            CancellationToken cancellationToken)
        {
            // Read raw body for HMAC SHA256 verification
            using var reader = new StreamReader(Request.Body, Encoding.UTF8);
            var rawBody = await reader.ReadToEndAsync(cancellationToken);

            var sharedSecret = _configuration["XRaySimulator:WebhookSecret"] ?? "oze-xray-shared-secret-key-2026";

            // If signature is provided, verify HMAC SHA256
            if (!string.IsNullOrWhiteSpace(signature))
            {
                var expectedSignature = ComputeHmacSha256(rawBody, sharedSecret);
                var providedSignature = signature.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase)
                    ? signature.Substring(7)
                    : signature;

                if (!string.Equals(expectedSignature, providedSignature, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Invalid webhook signature for event {EventId}", eventId);
                    return Unauthorized(ApiResponse.FailureResult("Invalid webhook signature"));
                }
            }

            var payload = JsonSerializer.Deserialize<ImagingSimulatorWebhookPayload>(rawBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (payload == null)
            {
                return BadRequest(ApiResponse.FailureResult("Invalid payload"));
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

        private static string ComputeHmacSha256(string data, string secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }
    }
}
