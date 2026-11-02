using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace OZE.Persistence.Repositories
{
    public class QueueRepository : IQueueRepository
    {
        private readonly AppIdentityDbContext _context;

        public QueueRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<QueueEntry> AddAsync(QueueEntry entry, CancellationToken cancellationToken = default)
        {
            await _context.QueueEntries.AddAsync(entry, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            return entry;
        }

        public async Task<QueueEntry?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return await _context.QueueEntries
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.Patient)
                .Include(x => x.Room)
                .Include(x => x.AssignedStaff)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<QueueEntry?> GetActiveByAppointmentAndTypeAsync(long appointmentId, string queueType, CancellationToken cancellationToken = default)
        {
            return await _context.QueueEntries
                .Where(x => x.AppointmentId == appointmentId && x.QueueType == queueType)
                .Where(x => x.Status == "WAITING" || x.Status == "CALLED" || x.Status == "IN_PROGRESS")
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<List<QueueEntry>> GetActiveEntriesAsync(string? queueType, int? roomId, CancellationToken cancellationToken = default)
        {
            var today = DateTimeOffset.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var query = _context.QueueEntries
                .AsNoTracking()
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.Patient)
                .Include(x => x.Room)
                .Include(x => x.AssignedStaff)
                .Where(x => x.CreatedAt >= today && x.CreatedAt < tomorrow)
                .Where(x => x.Status == "WAITING" || x.Status == "CALLED" || x.Status == "IN_PROGRESS");

            if (!string.IsNullOrWhiteSpace(queueType))
            {
                query = query.Where(x => x.QueueType == queueType);
            }

            if (roomId.HasValue)
            {
                query = query.Where(x => x.RoomId == roomId.Value);
            }

            return await query
                .OrderByDescending(x => x.Priority)
                .ThenBy(x => x.QueueNumber)
                .ToListAsync(cancellationToken);
        }

        public async Task<int> GetNextQueueNumberAsync(DateOnly date, string queueType, CancellationToken cancellationToken = default)
        {
            var startOfDay = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            var endOfDay = startOfDay.AddDays(1);

            var maxNumber = await _context.QueueEntries
                .Where(x => x.QueueType == queueType && x.CreatedAt >= startOfDay && x.CreatedAt < endOfDay)
                .Select(x => (int?)x.QueueNumber)
                .MaxAsync(cancellationToken);

            return (maxNumber ?? 0) + 1;
        }

        public async Task UpdateAsync(QueueEntry entry, CancellationToken cancellationToken = default)
        {
            _context.QueueEntries.Update(entry);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
