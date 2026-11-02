using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
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
            var now = DateTimeOffset.UtcNow;

            var entry = new QueueEntry
            {
                AppointmentId = appointmentId,
                QueueType = queueType,
                RoomId = roomId,
                AssignedStaffId = assignedStaffId,
                Priority = priority,
                Status = QueueConstants.Waiting,
                Notes = notes,
                CreatedAt = now
            };

            // The number is given by the repository, together with saving, so desks checking in together never share one
            var created = await _queueRepository.AddWithNextNumberAsync(entry, DateOnly.FromDateTime(DateTime.Today), cancellationToken);
            _logger.LogInformation("Enqueued appointment {AppointmentId} to {QueueType} queue as number {QueueNumber}",
                appointmentId, queueType, created.QueueNumber);

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

            if (newStatus == QueueConstants.Called)
            {
                entry.CalledAt = now;
            }
            else if (newStatus == QueueConstants.InProgress)
            {
                entry.StartedAt = now;
            }
            else if (newStatus == QueueConstants.Completed || newStatus == QueueConstants.Skipped || newStatus == QueueConstants.Cancelled)
            {
                entry.CompletedAt = now;
            }

            await _queueRepository.UpdateAsync(entry, cancellationToken);
            _logger.LogInformation("Updated queue entry {QueueId} for appointment {AppointmentId} to {Status}",
                entry.Id, appointmentId, newStatus);

            return entry;
        }

        public async Task<QueueEntry?> UpdatePriorityAsync(
            long appointmentId,
            string queueType,
            int priority,
            CancellationToken cancellationToken = default)
        {
            var entry = await _queueRepository.GetActiveByAppointmentAndTypeAsync(appointmentId, queueType, cancellationToken);
            if (entry == null)
            {
                _logger.LogWarning("No active queue entry found for appointment {AppointmentId} and type {QueueType}", appointmentId, queueType);
                return null;
            }

            entry.Priority = priority;
            await _queueRepository.UpdateAsync(entry, cancellationToken);
            return entry;
        }

        public async Task<List<QueueEntryResponse>> GetQueueEntriesAsync(
            string? queueType = null,
            int? roomId = null,
            bool includePatientDetails = false,
            CancellationToken cancellationToken = default)
        {
            var entries = await _queueRepository.GetActiveEntriesAsync(queueType, roomId, null, cancellationToken);
            return entries.Select(x => MapToResponse(x, includePatientDetails)).ToList();
        }

        public async Task<QueueEntryResponse?> CallNextAsync(
            string queueType,
            int? roomId = null,
            string? doctorUserId = null,
            CancellationToken cancellationToken = default)
        {
            // Patients of the examination queue belong to the doctor they booked, so a doctor only calls those
            int? assignedStaffId = null;
            if (doctorUserId != null && queueType == QueueConstants.ExaminationType)
            {
                assignedStaffId = await _queueRepository.GetStaffProfileIdByUserIdAsync(doctorUserId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(assignedStaffId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);
            }

            var entries = await _queueRepository.GetActiveEntriesAsync(queueType, roomId, assignedStaffId, cancellationToken);
            foreach (var next in entries.Where(x => x.Status == QueueConstants.Waiting))
            {
                var calledAt = DateTimeOffset.UtcNow;
                // Someone else may have called this patient a moment ago, then the next one in line is ours
                if (!await _queueRepository.TryMarkCalledAsync(next.Id, roomId, calledAt, cancellationToken))
                {
                    continue;
                }

                next.Status = QueueConstants.Called;
                next.CalledAt = calledAt;
                if (roomId.HasValue)
                {
                    next.RoomId = roomId.Value;
                }

                return MapToResponse(next, includePatientDetails: true);
            }

            return null;
        }

        public async Task<QueueEntryResponse> CallAsync(
            long queueEntryId,
            int? roomId = null,
            string? doctorUserId = null,
            CancellationToken cancellationToken = default)
        {
            var entry = await _queueRepository.GetByIdAsync(queueEntryId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(entry != null, ErrorConstants.QueueMessage.EntryNotFound);

            if (doctorUserId != null && entry!.QueueType == QueueConstants.ExaminationType)
            {
                var staffId = await _queueRepository.GetStaffProfileIdByUserIdAsync(doctorUserId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(staffId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);
                ConditionGuard.Ensure<ForbiddenException>(entry.AssignedStaffId == staffId, ErrorConstants.QueueMessage.NotYourPatientToCall);
            }

            // Numbers of earlier days are history, they cannot be called any more
            ConditionGuard.Ensure(DateOnly.FromDateTime(entry!.CreatedAt.LocalDateTime) == DateOnly.FromDateTime(DateTime.Today), ErrorConstants.QueueMessage.NotInTodayQueue);
            ConditionGuard.Ensure(entry.Status == QueueConstants.Waiting, ErrorConstants.QueueMessage.OnlyWaitingCanBeCalled);

            var calledAt = DateTimeOffset.UtcNow;
            // Checked again in the update itself: someone else may have called this number a moment ago
            ConditionGuard.Ensure(await _queueRepository.TryMarkCalledAsync(entry.Id, roomId, calledAt, cancellationToken),
                ErrorConstants.QueueMessage.OnlyWaitingCanBeCalled);

            entry.Status = QueueConstants.Called;
            entry.CalledAt = calledAt;
            if (roomId.HasValue)
            {
                entry.RoomId = roomId.Value;
            }

            return MapToResponse(entry, includePatientDetails: true);
        }

        public async Task<QueueEntryResponse> SkipAsync(
            long queueEntryId,
            string? doctorUserId = null,
            CancellationToken cancellationToken = default)
        {
            var entry = await _queueRepository.GetByIdAsync(queueEntryId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(entry != null, ErrorConstants.QueueMessage.EntryNotFound);

            if (doctorUserId != null && entry!.QueueType == QueueConstants.ExaminationType)
            {
                var staffId = await _queueRepository.GetStaffProfileIdByUserIdAsync(doctorUserId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(staffId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);
                ConditionGuard.Ensure<ForbiddenException>(entry.AssignedStaffId == staffId, ErrorConstants.QueueMessage.NotYourPatient);
            }

            ConditionGuard.Ensure(entry!.Status == QueueConstants.Called, ErrorConstants.QueueMessage.OnlyCalledCanBeSkipped);

            // Checked again in the update itself: the patient may have walked in at this very moment
            ConditionGuard.Ensure(await _queueRepository.TryMoveBackAsync(entry.Id, cancellationToken),
                ErrorConstants.QueueMessage.OnlyCalledCanBeSkipped);

            entry.Status = QueueConstants.Waiting;
            entry.CalledAt = null;
            entry.SkipCount++;
            _logger.LogInformation("Queue entry {QueueId} of appointment {AppointmentId} was called and not there, now skipped {SkipCount} time(s)",
                entry.Id, entry.AppointmentId, entry.SkipCount);

            return MapToResponse(entry, includePatientDetails: true);
        }

        public async Task<List<long>> CloseAbsentAsync(
            DateTimeOffset checkedInBefore,
            CancellationToken cancellationToken = default)
        {
            var entries = await _queueRepository.GetAbsentWaitingAsync(checkedInBefore, cancellationToken);
            var now = DateTimeOffset.UtcNow;
            foreach (var entry in entries)
            {
                entry.Status = QueueConstants.Skipped;
                entry.CompletedAt = now;
                await _queueRepository.UpdateAsync(entry, cancellationToken);
            }

            return entries.Select(x => x.AppointmentId).ToList();
        }


        private static QueueEntryResponse MapToResponse(QueueEntry x, bool includePatientDetails) => new()
        {
            Id = x.Id,
            AppointmentId = x.AppointmentId,
            QueueType = x.QueueType,
            RoomId = x.RoomId,
            RoomName = x.Room?.RoomName,
            AssignedStaffId = x.AssignedStaffId,
            StaffName = x.AssignedStaff?.FullName,
            PatientName = includePatientDetails
                ? x.Appointment?.Patient?.FullName ?? string.Empty
                : MaskName(x.Appointment?.Patient?.FullName),
            PatientCode = includePatientDetails ? x.Appointment?.Patient?.PatientCode ?? string.Empty : string.Empty,
            QueueNumber = x.QueueNumber,
            Priority = x.Priority,
            SkipCount = x.SkipCount,
            Status = x.Status,
            CalledAt = x.CalledAt,
            StartedAt = x.StartedAt,
            CompletedAt = x.CompletedAt,
            Notes = includePatientDetails ? x.Notes : null,
            CreatedAt = x.CreatedAt
        };

        // "Nguyen Van An" -> "N*** V*** A***": enough for a patient to recognise the name, not for a stranger to learn it
        private static string MaskName(string? fullName)
        {
            var words = (fullName ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return string.Join(' ', words.Select(word => word[0] + new string(QueueConstants.MaskCharacter, QueueConstants.MaskedLength)));
        }
    }
}
