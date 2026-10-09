using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IRoomService
    {
        Task<List<RoomResponse>> GetRoomsAsync(RoomQueryRequest query);
        Task<RoomResponse> GetRoomByIdAsync(int id);
        Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request);
        Task<RoomResponse> UpdateRoomAsync(int id, UpdateRoomRequest request);
        Task DeleteRoomAsync(int id);
    }
}
