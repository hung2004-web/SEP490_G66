using AutoMapper;
using OZE.Application.Helpers;
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
        private readonly IMapper _mapper;

        public RoomService(IRoomRepository roomRepository, IMapper mapper)
        {
            _roomRepository = roomRepository;
            _mapper = mapper;
        }

        public async Task<List<RoomResponse>> GetRoomsAsync(RoomQueryRequest query)
        {
            var rooms = await _roomRepository.GetAllAsync(query);
            return _mapper.Map<List<RoomResponse>>(rooms);
        }

        public async Task<RoomResponse> GetRoomByIdAsync(int id)
        {
            var room = await GetExistingRoomAsync(id);
            return _mapper.Map<RoomResponse>(room);
        }

        public async Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request)
        {
            var roomName = request.RoomName.Trim();
            EnsureValidRoomType(request.RoomType);
            ConditionGuard.ThrowIf(await _roomRepository.IsRoomNameInUseAsync(roomName), ErrorConstants.RoomMessage.RoomNameExist);

            var room = new Room
            {
                RoomName = roomName,
                RoomType = request.RoomType,
                Status = RoomConstants.ActiveStatus,
                Floor = TrimToNull(request.Floor),
                Description = TrimToNull(request.Description),
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _roomRepository.AddAsync(room);
            await _roomRepository.SaveChangesAsync();

            return _mapper.Map<RoomResponse>(room);
        }

        public async Task<RoomResponse> UpdateRoomAsync(int id, UpdateRoomRequest request)
        {
            var room = await GetExistingRoomAsync(id);
            var roomName = request.RoomName.Trim();

            EnsureValidRoomType(request.RoomType);
            ConditionGuard.Ensure(RoomConstants.Statuses.Contains(request.Status), ErrorConstants.RoomMessage.InvalidStatus);
            ConditionGuard.ThrowIf(await _roomRepository.IsRoomNameInUseAsync(roomName, id), ErrorConstants.RoomMessage.RoomNameExist);

            // Shifts already planned in the room keep it: it cannot leave service or change its type under them
            var leavesService = room.Status == RoomConstants.ActiveStatus && request.Status != RoomConstants.ActiveStatus;
            if (leavesService || room.RoomType != request.RoomType)
            {
                var hasShifts = await _roomRepository.HasUpcomingShiftsAsync(id, DateOnly.FromDateTime(ClinicClock.Today), TimeOnly.FromDateTime(ClinicClock.Now));
                ConditionGuard.ThrowIf(hasShifts, ErrorConstants.RoomMessage.HasUpcomingShifts);
            }

            room.RoomName = roomName;
            room.RoomType = request.RoomType;
            room.Status = request.Status;
            room.Floor = TrimToNull(request.Floor);
            room.Description = TrimToNull(request.Description);
            room.UpdatedAt = DateTimeOffset.UtcNow;

            await _roomRepository.SaveChangesAsync();

            return _mapper.Map<RoomResponse>(room);
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

        private static void EnsureValidRoomType(string roomType)
        {
            ConditionGuard.Ensure(RoomConstants.RoomTypes.Contains(roomType), ErrorConstants.RoomMessage.InvalidRoomType);
        }

        // Blank optional text is stored as null, not as an empty string
        private static string? TrimToNull(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}
