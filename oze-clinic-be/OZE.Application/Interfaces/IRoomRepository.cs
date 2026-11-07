using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IRoomRepository
    {
        Task<List<Room>> GetAllAsync(RoomQueryRequest query, CancellationToken cancellationToken = default);
        Task<Room?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        // Shifts in the room that are not over yet, from the given day on
        Task<bool> HasUpcomingShiftsAsync(int roomId, DateOnly today, TimeOnly now, CancellationToken cancellationToken = default);
        Task<bool> IsRoomNameInUseAsync(string roomName, int? excludeRoomId = null, CancellationToken cancellationToken = default);
        Task<bool> IsRoomInUseAsync(int id, CancellationToken cancellationToken = default);
        Task AddAsync(Room room, CancellationToken cancellationToken = default);
        void Remove(Room room);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
