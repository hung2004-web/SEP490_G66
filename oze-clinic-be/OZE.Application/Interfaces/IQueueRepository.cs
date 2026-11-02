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
        // Entries of today still on the board, highest priority first; inside a priority, the queue number plus
        // skipMoveBackPositions places for every time the patient was called and not there. A room also shows the entries not yet assigned to any room.
        Task<List<QueueEntry>> GetActiveEntriesAsync(string? queueType, int? roomId, int? assignedStaffId, int skipMoveBackPositions, CancellationToken cancellationToken = default);
        // Marks a waiting entry as called; false when someone else called it first
        Task<bool> TryMarkCalledAsync(long id, int? roomId, DateTimeOffset calledAt, CancellationToken cancellationToken = default);
        // A called patient who is not there goes back to waiting and steps back; false when the entry is no longer in the called state
        Task<bool> TryMoveBackAsync(long id, CancellationToken cancellationToken = default);
        // Examination entries still waiting although the patient was already called and not there, checked in before the given time (tracked)
        Task<List<QueueEntry>> GetAbsentWaitingAsync(DateTimeOffset checkedInBefore, CancellationToken cancellationToken = default);
        Task<string?> GetConfigValueAsync(string configKey);
        Task<int?> GetStaffProfileIdByUserIdAsync(string userId, CancellationToken cancellationToken = default);
        Task UpdateAsync(QueueEntry entry, CancellationToken cancellationToken = default);
    }
}
