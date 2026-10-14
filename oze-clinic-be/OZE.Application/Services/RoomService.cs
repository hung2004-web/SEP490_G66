using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class RoomService : IRoomService
    {
        private readonly IRoomRepository _roomRepository;

        public RoomService(IRoomRepository roomRepository)
        {
            _roomRepository = roomRepository;
        }

        public async Task<List<RoomResponse>> GetRoomsAsync(RoomQueryRequest query)
        {
            var rooms = await _roomRepository.GetAllAsync(query);
            return rooms.Select(ToResponse).ToList();
        }

        public async Task<RoomResponse> GetRoomByIdAsync(int id)
        {
            var room = await GetExistingRoomAsync(id);
            return ToResponse(room);
        }

        public async Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request)
        {
            var roomName = request.RoomName.Trim();
            ConditionGuard.Ensure(RoomConstants.RoomTypes.Contains(request.RoomType), ErrorConstants.RoomMessage.InvalidRoomType);
            ConditionGuard.ThrowIf(await _roomRepository.IsRoomNameInUseAsync(roomName), ErrorConstants.RoomMessage.RoomNameExist);

            var room = new Room
            {
                RoomName = roomName,
                RoomType = request.RoomType,
                Status = RoomConstants.ActiveStatus,
                Floor = request.Floor?.Trim(),
                Description = request.Description?.Trim(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _roomRepository.AddAsync(room);
            await _roomRepository.SaveChangesAsync();

            return ToResponse(room);
        }

        public async Task<RoomResponse> UpdateRoomAsync(int id, UpdateRoomRequest request)
        {
            var room = await GetExistingRoomAsync(id);
            var roomName = request.RoomName.Trim();

            ConditionGuard.Ensure(RoomConstants.RoomTypes.Contains(request.RoomType), ErrorConstants.RoomMessage.InvalidRoomType);
            ConditionGuard.Ensure(RoomConstants.Statuses.Contains(request.Status), ErrorConstants.RoomMessage.InvalidStatus);
            ConditionGuard.ThrowIf(await _roomRepository.IsRoomNameInUseAsync(roomName, id), ErrorConstants.RoomMessage.RoomNameExist);

            room.RoomName = roomName;
            room.RoomType = request.RoomType;
            room.Status = request.Status;
            room.Floor = request.Floor?.Trim();
            room.Description = request.Description?.Trim();
            room.UpdatedAt = DateTimeOffset.UtcNow;

            await _roomRepository.SaveChangesAsync();

            return ToResponse(room);
        }

        public async Task DeleteRoomAsync(int id)
        {
            var room = await GetExistingRoomAsync(id);

            // A room referenced by schedules or queue entries keeps history, so it can only be deactivated
            ConditionGuard.ThrowIf(await _roomRepository.IsRoomInUseAsync(id), ErrorConstants.RoomMessage.RoomInUse);

            _roomRepository.Remove(room);
            await _roomRepository.SaveChangesAsync();
        }

        private async Task<Room> GetExistingRoomAsync(int id)
        {
            var room = await _roomRepository.GetByIdAsync(id);
            ConditionGuard.Ensure<NotFoundException>(room != null, ErrorConstants.RoomMessage.RoomNotFound);
            return room!;
        }

        private static RoomResponse ToResponse(Room room)
        {
            return new RoomResponse
            {
                Id = room.Id,
                RoomName = room.RoomName,
                RoomType = room.RoomType,
                Status = room.Status,
                Floor = room.Floor,
                Description = room.Description,
                CreatedAt = room.CreatedAt,
                UpdatedAt = room.UpdatedAt
            };
        }
    }
}
