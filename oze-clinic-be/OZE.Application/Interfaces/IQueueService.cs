using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IQueueService
    {
        Task<QueueEntry> EnqueueAsync(
            long appointmentId,
            string queueType,
            int? roomId = null,
            int? assignedStaffId = null,
            int priority = 0,
            string? notes = null,
            CancellationToken cancellationToken = default);

        Task<QueueEntry?> UpdateStatusAsync(
            long appointmentId,
            string queueType,
            string newStatus,
            CancellationToken cancellationToken = default);

        // Keeps the place in the queue in line with the priority of the appointment
        Task<QueueEntry?> UpdatePriorityAsync(
            long appointmentId,
            string queueType,
            int priority,
            CancellationToken cancellationToken = default);

        // Without patient details the board is safe to show on a public screen: masked name, no code, no notes
        Task<List<QueueEntryResponse>> GetQueueEntriesAsync(
            string? queueType = null,
            int? roomId = null,
            bool includePatientDetails = false,
            CancellationToken cancellationToken = default);

        // Calls this very number instead of the first in line, e.g. when the patient first in line is not there.
        // A doctor can only call own patients of the examination queue.
        Task<QueueEntryResponse> CallAsync(
            long queueEntryId,
            int? roomId = null,
            string? doctorUserId = null,
            CancellationToken cancellationToken = default);

        // The patient was called but is not there: keeps the number, goes back to waiting behind everyone who was not skipped, so
        // others can go first. A doctor can only do this for own patients of the examination queue.
        Task<QueueEntryResponse> SkipAsync(
            long queueEntryId,
            string? doctorUserId = null,
            CancellationToken cancellationToken = default);

        // A doctor is on duty only between "start shift" and "end shift". Off duty (not started yet, or ended) there are no new
        // patients to call or to examine; the ones already examined (back from the X-ray) are still theirs, and an examination
        // in progress is finished as usual.
        Task<bool> IsDoctorOffDutyAsync(int staffId, CancellationToken cancellationToken = default);

        // A doctor (doctorUserId) is only handed the patients booked with that doctor in the examination queue
        Task<QueueEntryResponse?> CallNextAsync(
            string queueType,
            int? roomId = null,
            string? doctorUserId = null,
            CancellationToken cancellationToken = default);
    }
}
