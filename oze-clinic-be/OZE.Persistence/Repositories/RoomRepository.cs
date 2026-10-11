using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
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

        public async Task<List<Room>> GetAllAsync(RoomQueryRequest query)
        {
            var rooms = _context.Rooms.AsNoTracking().AsQueryable();

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

            return await rooms.OrderBy(x => x.RoomName).ToListAsync();
        }

        public async Task<Room?> GetByIdAsync(int id)
        {
            return await _context.Rooms.FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<bool> IsRoomNameInUseAsync(string roomName, int? excludeRoomId = null)
        {
            return await _context.Rooms.AnyAsync(x => x.RoomName == roomName && x.Id != excludeRoomId);
        }

        public async Task<bool> IsRoomInUseAsync(int id)
        {
            return await _context.StaffSchedules.AnyAsync(x => x.RoomId == id)
                || await _context.QueueEntries.AnyAsync(x => x.RoomId == id);
        }

        public async Task AddAsync(Room room)
        {
            await _context.Rooms.AddAsync(room);
        }

        public void Remove(Room room)
        {
            _context.Rooms.Remove(room);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
