using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IRoomRepository
    {
        Task<List<Room>> GetAllAsync(RoomQueryRequest query);
        Task<Room?> GetByIdAsync(int id);
        Task<bool> IsRoomNameInUseAsync(string roomName, int? excludeRoomId = null);
        Task<bool> IsRoomInUseAsync(int id);
        Task AddAsync(Room room);
        void Remove(Room room);
        Task SaveChangesAsync();
    }
}
