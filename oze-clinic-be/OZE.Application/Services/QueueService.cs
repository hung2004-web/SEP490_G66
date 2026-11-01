using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace OZE.Application.Services
{
    public class QueueService : IQueueService
    {
        private readonly IQueueRepository _queueRepository;
        private readonly ILogger<QueueService> _logger;

        public QueueService(IQueueRepository queueRepository, ILogger<QueueService> logger)
        {
            _queueRepository = queueRepository;
            _logger = logger;
        }

        public async Task<QueueEntry> EnqueueAsync(
            long appointmentId,
            string queueType,
            int? roomId = null,
            int? assignedStaffId = null,
            int priority = 0,
            string? notes = null,
            CancellationToken cancellationToken = default)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var queueNumber = await _queueRepository.GetNextQueueNumberAsync(today, queueType, cancellationToken);
            var now = DateTimeOffset.UtcNow;

            var entry = new QueueEntry
            {
                AppointmentId = appointmentId,
                QueueType = queueType,
                RoomId = roomId,
                AssignedStaffId = assignedStaffId,
                QueueNumber = queueNumber,
                Priority = priority,
                Status = "WAITING",
                Notes = notes,
                CreatedAt = now
            };

            var created = await _queueRepository.AddAsync(entry, cancellationToken);
            _logger.LogInformation("Enqueued appointment {AppointmentId} to {QueueType} queue as number {QueueNumber}",
                appointmentId, queueType, queueNumber);

            return created;
        }

        public async Task<QueueEntry?> UpdateStatusAsync(
            long appointmentId,
            string queueType,
            string newStatus,
            CancellationToken cancellationToken = default)
        {
            var entry = await _queueRepository.GetActiveByAppointmentAndTypeAsync(appointmentId, queueType, cancellationToken);
            if (entry == null)
            {
                _logger.LogWarning("No active queue entry found for appointment {AppointmentId} and type {QueueType}", appointmentId, queueType);
                return null;
            }

            var now = DateTimeOffset.UtcNow;
            entry.Status = newStatus;

            if (newStatus == "CALLED")
            {
                entry.CalledAt = now;
            }
            else if (newStatus == "IN_PROGRESS")
            {
                entry.StartedAt = now;
            }
            else if (newStatus == "COMPLETED" || newStatus == "SKIPPED" || newStatus == "CANCELLED")
            {
                entry.CompletedAt = now;
            }

            await _queueRepository.UpdateAsync(entry, cancellationToken);
            _logger.LogInformation("Updated queue entry {QueueId} for appointment {AppointmentId} to {Status}",
                entry.Id, appointmentId, newStatus);

            return entry;
        }

        public async Task<List<QueueEntryResponse>> GetQueueEntriesAsync(
            string? queueType = null,
            int? roomId = null,
            CancellationToken cancellationToken = default)
        {
            var entries = await _queueRepository.GetActiveEntriesAsync(queueType, roomId, cancellationToken);
            return entries.Select(MapToResponse).ToList();
        }

        public async Task<QueueEntryResponse?> CallNextAsync(
            string queueType,
            int? roomId = null,
            CancellationToken cancellationToken = default)
        {
            var entries = await _queueRepository.GetActiveEntriesAsync(queueType, roomId, cancellationToken);
            var next = entries.FirstOrDefault(x => x.Status == "WAITING");
            if (next == null)
            {
                return null;
            }

            next.Status = "CALLED";
            next.CalledAt = DateTimeOffset.UtcNow;
            if (roomId.HasValue)
            {
                next.RoomId = roomId.Value;
            }

            await _queueRepository.UpdateAsync(next, cancellationToken);
            return MapToResponse(next);
        }

        private static QueueEntryResponse MapToResponse(QueueEntry x) => new()
        {
            Id = x.Id,
            AppointmentId = x.AppointmentId,
            QueueType = x.QueueType,
            RoomId = x.RoomId,
            RoomName = x.Room?.RoomName,
            AssignedStaffId = x.AssignedStaffId,
            StaffName = x.AssignedStaff?.FullName,
            PatientName = x.Appointment?.Patient?.FullName ?? string.Empty,
            PatientCode = x.Appointment?.Patient?.PatientCode ?? string.Empty,
            QueueNumber = x.QueueNumber,
            Priority = x.Priority,
            Status = x.Status,
            CalledAt = x.CalledAt,
            StartedAt = x.StartedAt,
            CompletedAt = x.CompletedAt,
            Notes = x.Notes,
            CreatedAt = x.CreatedAt
        };
    }
}
