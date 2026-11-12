using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Common.Models;

namespace OZE.Application.BackgroundServices
{
    // Once a day at RunHour (clinic time): remind installments due DaysAhead days later, and overdue ones once a week
    public class PaymentReminderBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IOptionsMonitor<PaymentReminderSettings> _settings;
        private readonly ILogger<PaymentReminderBackgroundService> _logger;
        private DateOnly? _lastRunClinicDate;

        public PaymentReminderBackgroundService(
            IServiceScopeFactory scopeFactory,
            IOptionsMonitor<PaymentReminderSettings> settings,
            ILogger<PaymentReminderBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _settings = settings;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                var config = _settings.CurrentValue;
                try
                {
                    var clinicNow = ClinicClock.Now;
                    var today = DateOnly.FromDateTime(clinicNow);
                    if (config.Enabled && clinicNow.Hour >= config.RunHour && _lastRunClinicDate != today)
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var debtService = scope.ServiceProvider.GetRequiredService<IDebtService>();
                        var result = await debtService.RemindDueInstallmentsAsync(today.AddDays(config.DaysAhead), stoppingToken);
                        _logger.LogInformation(
                            "Automated payment reminders: {Reminded}/{Total} sent, {Failed} failed.",
                            result.RemindedCount, result.TotalTargeted, result.FailedCount);
                        _lastRunClinicDate = today;
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Automated payment reminders failed.");
                }

                await Task.Delay(TimeSpan.FromMinutes(Math.Max(1, config.CheckIntervalMinutes)), stoppingToken);
            }
        }
    }
}
