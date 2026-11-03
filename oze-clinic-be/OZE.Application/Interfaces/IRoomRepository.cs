using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IRoomRepository
    {
        Task<List<Room>> GetAllAsync(RoomQueryRequest query);
        Task<Room?> GetByIdAsync(int id);
        // Shifts in the room that are not over yet, from the given day on
        Task<bool> HasUpcomingShiftsAsync(int roomId, DateOnly today, TimeOnly now);
        Task<bool> IsRoomNameInUseAsync(string roomName, int? excludeRoomId = null);
        Task<bool> IsRoomInUseAsync(int id);
        Task AddAsync(Room room);
        void Remove(Room room);
        Task SaveChangesAsync();
    }
}
