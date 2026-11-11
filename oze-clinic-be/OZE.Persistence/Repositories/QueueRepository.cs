using OZE.Application.Helpers;
using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
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

        public async Task<QueueEntry> AddWithNextNumberAsync(QueueEntry entry, DateOnly date, CancellationToken cancellationToken = default)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            // The lock is held until the commit, so the next caller sees the number taken here
            var resource = $"{QueueConstants.NumberLockPrefix}{entry.QueueType}:{date:yyyyMMdd}";
            await _context.Database.ExecuteSqlInterpolatedAsync($@"
                DECLARE @result int;
                EXEC @result = sp_getapplock @Resource = {resource}, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = {QueueConstants.NumberLockTimeoutMilliseconds};
                IF @result < 0 THROW 50001, 'Could not get the queue number lock.', 1;", cancellationToken);

            var (start, end) = DayWindow(date);
            var maxNumber = await _context.QueueEntries
                .Where(x => x.QueueType == entry.QueueType && x.CreatedAt >= start && x.CreatedAt < end)
                .Select(x => (int?)x.QueueNumber)
                .MaxAsync(cancellationToken);
            entry.QueueNumber = (maxNumber ?? 0) + 1;

            await _context.QueueEntries.AddAsync(entry, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return entry;
        }

        public async Task<QueueEntry?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return await _context.QueueEntries
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.Patient)
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.Examination)
                .Include(x => x.Room)
                .Include(x => x.AssignedStaff)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<QueueEntry?> GetActiveByAppointmentAndTypeAsync(long appointmentId, string queueType, CancellationToken cancellationToken = default)
        {
            return await _context.QueueEntries
                .Where(x => x.AppointmentId == appointmentId && x.QueueType == queueType)
                .Where(x => QueueConstants.ActiveStatuses.Contains(x.Status))
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<List<QueueEntry>> GetActiveEntriesAsync(string? queueType, int? roomId, int? assignedStaffId, CancellationToken cancellationToken = default)
        {
            var (today, tomorrow) = DayWindow(DateOnly.FromDateTime(ClinicClock.Today));

            var query = _context.QueueEntries
                .AsNoTracking()
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.Patient)
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.Examination)
                .Include(x => x.Room)
                .Include(x => x.AssignedStaff)
                .Where(x => x.CreatedAt >= today && x.CreatedAt < tomorrow)
                .Where(x => QueueConstants.ActiveStatuses.Contains(x.Status));

            if (!string.IsNullOrWhiteSpace(queueType))
            {
                query = query.Where(x => x.QueueType == queueType);
            }

            if (roomId.HasValue)
            {
                // Patients are queued before a room is chosen, so a room also serves the ones nobody has assigned yet
                query = query.Where(x => x.RoomId == roomId.Value || x.RoomId == null);
            }

            if (assignedStaffId.HasValue)
            {
                query = query.Where(x => x.AssignedStaffId == assignedStaffId.Value);
            }

            return await query
                .OrderBy(x => x.SkipCount)
                .ThenByDescending(x => x.Priority)
                .ThenBy(x => x.QueueNumber)
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> TryMarkCalledAsync(long id, int? roomId, DateTimeOffset calledAt, CancellationToken cancellationToken = default)
        {
            // One statement that only succeeds while the entry is still waiting, so two callers cannot both get it
            var rows = await _context.QueueEntries
                .Where(x => x.Id == id && x.Status == QueueConstants.Waiting)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, QueueConstants.Called)
                    .SetProperty(x => x.CalledAt, calledAt)
                    .SetProperty(x => x.RoomId, x => roomId ?? x.RoomId), cancellationToken);
            return rows == 1;
        }

        public async Task<bool> TryMoveBackAsync(long id, CancellationToken cancellationToken = default)
        {
            // Only succeeds while the patient is still called, so it cannot undo a patient who has just come in
            var rows = await _context.QueueEntries
                .Where(x => x.Id == id && x.Status == QueueConstants.Called)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, QueueConstants.Waiting)
                    .SetProperty(x => x.CalledAt, (DateTimeOffset?)null)
                    .SetProperty(x => x.SkipCount, x => x.SkipCount + 1), cancellationToken);
            return rows == 1;
        }

        public async Task<bool> IsOffDutyAsync(int staffId, DateOnly date, CancellationToken cancellationToken = default)
        {
            // On duty only between "start shift" and "end shift" of a shift of that day
            return !await _context.StaffSchedules
                .AsNoTracking()
                .AnyAsync(x => x.StaffProfileId == staffId && x.ScheduleDate == date
                    && x.ActualStartTime != null && x.ActualEndTime == null, cancellationToken);
        }

        public async Task<int?> GetStaffProfileIdByUserIdAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await _context.StaffProfiles
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .Select(x => (int?)x.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task UpdateAsync(QueueEntry entry, CancellationToken cancellationToken = default)
        {
            _context.QueueEntries.Update(entry);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // A day of the clinic runs on the server's local time, like check-in does
        public async Task<string?> GetConfigValueAsync(string configKey, CancellationToken cancellationToken = default)
        {
            return await _context.SystemConfigurations
                .AsNoTracking()
                .Where(x => x.ConfigKey == configKey)
                .Select(x => x.ConfigValue)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private static (DateTimeOffset Start, DateTimeOffset End) DayWindow(DateOnly date)
        {
            var start = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue));
            return (start, start.AddDays(1));
        }
    }
}
