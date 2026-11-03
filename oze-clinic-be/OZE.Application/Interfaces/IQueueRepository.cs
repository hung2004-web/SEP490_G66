using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IQueueRepository
    {
        // Gives the entry the next number of its queue for that day and saves it; two callers never get the same number
        Task<QueueEntry> AddWithNextNumberAsync(QueueEntry entry, DateOnly date, CancellationToken cancellationToken = default);
        Task<QueueEntry?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<QueueEntry?> GetActiveByAppointmentAndTypeAsync(long appointmentId, string queueType, CancellationToken cancellationToken = default);
        // Entries of today still on the board. Patients who were called and not there come after everyone who was not
        // (the more times, the later); inside each group the highest priority goes first, then the queue number.
        // A room also shows the entries not yet assigned to any room.
        Task<List<QueueEntry>> GetActiveEntriesAsync(string? queueType, int? roomId, int? assignedStaffId, CancellationToken cancellationToken = default);
        // Marks a waiting entry as called; false when someone else called it first
        Task<bool> TryMarkCalledAsync(long id, int? roomId, DateTimeOffset calledAt, CancellationToken cancellationToken = default);
        // A called patient who is not there goes back to waiting behind the others; false when the entry is no longer in the called state
        Task<bool> TryMoveBackAsync(long id, CancellationToken cancellationToken = default);
        Task<int?> GetStaffProfileIdByUserIdAsync(string userId, CancellationToken cancellationToken = default);
        Task UpdateAsync(QueueEntry entry, CancellationToken cancellationToken = default);
    }
}
