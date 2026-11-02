using OZE.Application.Interfaces;
using OZE.Common.Constants;

namespace OZE.BackgroundServices
{
    /// <summary>
    /// Looks every minute for patients who were called, were not there and are still waiting when the morning ends,
    /// and marks their appointments NO_SHOW.
    /// </summary>
    public class QueueNoShowWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<QueueNoShowWorker> _logger;

        public QueueNoShowWorker(IServiceScopeFactory scopeFactory, ILogger<QueueNoShowWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var interval = TimeSpan.FromSeconds(QueueConstants.NoShowCheckIntervalSeconds);
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IAbsentPatientService>();
                    await service.MarkNoShowAfterMorningAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // One failed round must not stop the worker; the next one tries again
                    _logger.LogError(ex, "Marking absent patients as NO_SHOW failed");
                }

                try
                {
                    await Task.Delay(interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}
