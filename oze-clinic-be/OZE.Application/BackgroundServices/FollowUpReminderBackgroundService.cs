using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Common.Models;

namespace OZE.Application.BackgroundServices
{
    public class FollowUpReminderBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IOptionsMonitor<FollowUpReminderSettings> _settings;
        private readonly ILogger<FollowUpReminderBackgroundService> _logger;
        private DateOnly? _lastRunClinicDate;

        public FollowUpReminderBackgroundService(
            IServiceScopeFactory scopeFactory,
            IOptionsMonitor<FollowUpReminderSettings> settings,
            ILogger<FollowUpReminderBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _settings = settings;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("FollowUpReminderBackgroundService has started.");

            // Brief initial delay so the application can finish startup completely
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var config = _settings.CurrentValue;
                    if (config.Enabled)
                    {
                        var clinicNow = ClinicClock.Now;
                        var today = DateOnly.FromDateTime(clinicNow);

                        // Trigger once per day when current clinic hour reaches or passes RunHour (e.g. 8 AM)
                        if (clinicNow.Hour >= config.RunHour && _lastRunClinicDate != today)
                        {
                            var targetDate = today.AddDays(config.DaysAhead);
                            _logger.LogInformation(
                                "Running automated follow-up reminder check for target date {TargetDate}...",
                                targetDate);

                            using (var scope = _scopeFactory.CreateScope())
                            {
                                var examinationService = scope.ServiceProvider.GetRequiredService<IExaminationService>();
                                var result = await examinationService.RemindDueFollowUpsAsync(
                                    targetDate,
                                    "System_BackgroundService",
                                    stoppingToken);

                                _logger.LogInformation(
                                    "Automated follow-up reminders completed: {Reminded}/{Total} sent, {Failed} failed for target date {TargetDate}.",
                                    result.RemindedCount,
                                    result.TotalTargeted,
                                    result.FailedCount,
                                    targetDate);
                            }

                            _lastRunClinicDate = today;
                        }
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in FollowUpReminderBackgroundService.");
                }

                var delayMinutes = Math.Max(1, _settings.CurrentValue.CheckIntervalMinutes);
                await Task.Delay(TimeSpan.FromMinutes(delayMinutes), stoppingToken);
            }

            _logger.LogInformation("FollowUpReminderBackgroundService is stopping.");
        }
    }
}
