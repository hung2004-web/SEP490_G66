using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
using OZE.Common.Constants;

namespace OZE.Application.Services
{
    public class AbsentPatientService : IAbsentPatientService
    {
        private readonly IQueueService _queueService;
        private readonly IQueueRepository _queueRepository;
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly ILogger<AbsentPatientService> _logger;

        public AbsentPatientService(
            IQueueService queueService,
            IQueueRepository queueRepository,
            IAppointmentRepository appointmentRepository,
            IAuditLogService auditLogService,
            ILogger<AbsentPatientService> logger)
        {
            _queueService = queueService;
            _queueRepository = queueRepository;
            _appointmentRepository = appointmentRepository;
            _auditLogService = auditLogService;
            _logger = logger;
        }

        public async Task<int> MarkNoShowAfterMorningAsync(CancellationToken cancellationToken = default)
        {
            var morningEnd = await GetMorningEndAsync();
            var now = DateTime.Now;
            if (now.TimeOfDay < morningEnd.ToTimeSpan())
            {
                return 0;
            }

            // Everyone checked in before the end of this morning (earlier days included, if a sweep was ever missed)
            var cutoff = new DateTimeOffset(now.Date + morningEnd.ToTimeSpan());
            var appointmentIds = await _queueService.CloseAbsentAsync(cutoff, cancellationToken);

            var marked = 0;
            foreach (var appointmentId in appointmentIds)
            {
                var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(appointmentId, cancellationToken);
                // A patient who turned up and is already being seen, or is done, keeps the status
                if (appointment == null || appointment.Status != AppointmentConstants.CheckedInStatus)
                {
                    continue;
                }

                var oldStatus = appointment.Status;
                appointment.Status = AppointmentConstants.NoShowStatus;
                appointment.UpdatedAt = DateTimeOffset.UtcNow;
                await _appointmentRepository.UpdateAsync(appointment);
                await _auditLogService.LogAsync(AuditConstants.AppointmentNoShow, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                    new { Status = oldStatus }, new { appointment.Status }, "Called and not there until the end of the morning");
                marked++;
            }

            if (marked > 0)
            {
                _logger.LogInformation("Marked {Count} absent patient(s) as NO_SHOW at the end of the morning", marked);
            }

            return marked;
        }

        private async Task<TimeOnly> GetMorningEndAsync()
        {
            var value = await _queueRepository.GetConfigValueAsync(ConfigKeyConstants.QueueMorningEndTime);
            return TimeOnly.TryParse(value, out var time) ? time : TimeOnly.Parse(QueueConstants.DefaultMorningEndTime);
        }
    }
}
