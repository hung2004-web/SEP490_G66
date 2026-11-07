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

        public async Task<List<RoomResponse>> GetRoomsAsync(RoomQueryRequest query, CancellationToken cancellationToken = default)
        {
            var rooms = await _roomRepository.GetAllAsync(query, cancellationToken);
            return _mapper.Map<List<RoomResponse>>(rooms);
        }

        public async Task<RoomResponse> GetRoomByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            var room = await GetExistingRoomAsync(id, cancellationToken);
            return _mapper.Map<RoomResponse>(room);
        }

        public async Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request, CancellationToken cancellationToken = default)
        {
            var roomName = request.RoomName.Trim();
            EnsureValidRoomType(request.RoomType);
            ConditionGuard.ThrowIf(await _roomRepository.IsRoomNameInUseAsync(roomName, cancellationToken: cancellationToken), ErrorConstants.RoomMessage.RoomNameExist);

            var room = new Room
            {
                RoomName = roomName,
                RoomType = request.RoomType,
                Status = RoomConstants.ActiveStatus,
                Floor = TrimToNull(request.Floor),
                Description = TrimToNull(request.Description),
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _roomRepository.AddAsync(room, cancellationToken);
            await _roomRepository.SaveChangesAsync(cancellationToken);

            return _mapper.Map<RoomResponse>(room);
        }

        public async Task<RoomResponse> UpdateRoomAsync(int id, UpdateRoomRequest request, CancellationToken cancellationToken = default)
        {
            var room = await GetExistingRoomAsync(id, cancellationToken);
            var roomName = request.RoomName.Trim();

            EnsureValidRoomType(request.RoomType);
            ConditionGuard.Ensure(RoomConstants.Statuses.Contains(request.Status), ErrorConstants.RoomMessage.InvalidStatus);
            // The database compares names without case, so a name that only changes case cannot clash with another room
            var nameChanged = !string.Equals(room.RoomName, roomName, StringComparison.OrdinalIgnoreCase);
            if (nameChanged)
            {
                ConditionGuard.ThrowIf(await _roomRepository.IsRoomNameInUseAsync(roomName, id, cancellationToken), ErrorConstants.RoomMessage.RoomNameExist);
            }

            // Shifts already planned in the room keep it: it cannot leave service or change its type under them
            var leavesService = room.Status == RoomConstants.ActiveStatus && request.Status != RoomConstants.ActiveStatus;
            if (leavesService || room.RoomType != request.RoomType)
            {
                var hasShifts = await _roomRepository.HasUpcomingShiftsAsync(id, DateOnly.FromDateTime(ClinicClock.Today), TimeOnly.FromDateTime(ClinicClock.Now), cancellationToken);
                ConditionGuard.ThrowIf(hasShifts, ErrorConstants.RoomMessage.HasUpcomingShifts);
            }

            room.RoomName = roomName;
            room.RoomType = request.RoomType;
            room.Status = request.Status;
            room.Floor = TrimToNull(request.Floor);
            room.Description = TrimToNull(request.Description);
            room.UpdatedAt = DateTimeOffset.UtcNow;

            await _roomRepository.SaveChangesAsync(cancellationToken);

            return _mapper.Map<RoomResponse>(room);
        }

        public async Task DeleteRoomAsync(int id, CancellationToken cancellationToken = default)
        {
            var room = await GetExistingRoomAsync(id, cancellationToken);

            // A room referenced by schedules or queue entries keeps history, so it can only be deactivated
            ConditionGuard.ThrowIf(await _roomRepository.IsRoomInUseAsync(id, cancellationToken), ErrorConstants.RoomMessage.RoomInUse);

            _roomRepository.Remove(room);
            await _roomRepository.SaveChangesAsync(cancellationToken);
        }

        private async Task<Room> GetExistingRoomAsync(int id, CancellationToken cancellationToken)
        {
            var room = await _roomRepository.GetByIdAsync(id, cancellationToken);
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
