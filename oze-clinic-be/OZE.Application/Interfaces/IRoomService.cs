using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IRoomService
    {
        Task<List<RoomResponse>> GetRoomsAsync(RoomQueryRequest query, CancellationToken cancellationToken = default);
        Task<RoomResponse> GetRoomByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request, CancellationToken cancellationToken = default);
        Task<RoomResponse> UpdateRoomAsync(int id, UpdateRoomRequest request, CancellationToken cancellationToken = default);
        Task DeleteRoomAsync(int id, CancellationToken cancellationToken = default);
    }
}
