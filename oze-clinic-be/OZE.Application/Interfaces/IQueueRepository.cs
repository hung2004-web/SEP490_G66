using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IQueueRepository
    {
        Task<QueueEntry> AddAsync(QueueEntry entry, CancellationToken cancellationToken = default);
        Task<QueueEntry?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<QueueEntry?> GetActiveByAppointmentAndTypeAsync(long appointmentId, string queueType, CancellationToken cancellationToken = default);
        Task<List<QueueEntry>> GetActiveEntriesAsync(string? queueType, int? roomId, CancellationToken cancellationToken = default);
        Task<int> GetNextQueueNumberAsync(DateOnly date, string queueType, CancellationToken cancellationToken = default);
        Task UpdateAsync(QueueEntry entry, CancellationToken cancellationToken = default);
    }
}
