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

        Task<List<QueueEntryResponse>> GetQueueEntriesAsync(
            string? queueType = null,
            int? roomId = null,
            CancellationToken cancellationToken = default);

        Task<QueueEntryResponse?> CallNextAsync(
            string queueType,
            int? roomId = null,
            CancellationToken cancellationToken = default);
    }
}
