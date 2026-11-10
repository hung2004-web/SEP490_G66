    using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class RoomRepository : IRoomRepository
    {
        private readonly AppIdentityDbContext _context;

        public RoomRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<List<Room>> GetAllAsync(RoomQueryRequest query, CancellationToken cancellationToken = default)
        {
            var rooms = _context.Rooms.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim();
                rooms = rooms.Where(x => x.RoomName.Contains(keyword));
            }

            if (!string.IsNullOrWhiteSpace(query.RoomType))
            {
                rooms = rooms.Where(x => x.RoomType == query.RoomType);
            }

            if (!string.IsNullOrWhiteSpace(query.Status))
            {
                rooms = rooms.Where(x => x.Status == query.Status);
            }

            return await rooms.OrderBy(x => x.RoomName).ToListAsync(cancellationToken);
        }

        public Task<bool> HasUpcomingShiftsAsync(int roomId, DateOnly today, TimeOnly now, CancellationToken cancellationToken = default)
        {
            return _context.StaffSchedules.AnyAsync(x => x.RoomId == roomId
                && (x.ScheduleDate > today || (x.ScheduleDate == today && x.ActualEndTime == null && x.ShiftEnd > now)),
                cancellationToken);
        }

        // FindAsync returns a room already tracked by this request without another query
        public async Task<Room?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await _context.Rooms.FindAsync(new object[] { id }, cancellationToken);
        }

        public Task<bool> IsRoomNameInUseAsync(string roomName, int? excludeRoomId = null, CancellationToken cancellationToken = default)
        {
            return _context.Rooms.AnyAsync(x => x.RoomName == roomName && x.Id != excludeRoomId, cancellationToken);
        }

        // One round trip: the room has a schedule or a queue entry
        public Task<bool> IsRoomInUseAsync(int id, CancellationToken cancellationToken = default)
        {
            return _context.Rooms.AnyAsync(r => r.Id == id
                && (_context.StaffSchedules.Any(x => x.RoomId == id) || _context.QueueEntries.Any(x => x.RoomId == id)),
                cancellationToken);
        }

        public async Task AddAsync(Room room, CancellationToken cancellationToken = default)
        {
            await _context.Rooms.AddAsync(room, cancellationToken);
        }

        public void Remove(Room room)
        {
            _context.Rooms.Remove(room);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (IsDuplicateRoomName(ex))
            {
                // Two requests passed the name check at the same time; the unique index kept the first one
                throw new BadRequestException(ErrorConstants.RoomMessage.RoomNameExist);
            }
        }

        private static bool IsDuplicateRoomName(DbUpdateException exception)
        {
            return exception.InnerException is SqlException sql
                && (sql.Number == 2601 || sql.Number == 2627)
                && sql.Message.Contains("IX_Rooms_RoomName", StringComparison.OrdinalIgnoreCase);
        }
    }
}
