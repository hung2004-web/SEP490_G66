using AutoMapper;
using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.MappingProfiles;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services
{
    // Room management: unique name, allowed type and status, and rooms that still have shifts or history
    public class RoomServiceTests
    {
        private readonly Mock<IRoomRepository> _roomRepositoryMock = new();
        private readonly RoomService _service;

        public RoomServiceTests()
        {
            var mapper = new MapperConfiguration(cfg => cfg.AddProfile<BaseMappingObject>()).CreateMapper();
            _service = new RoomService(_roomRepositoryMock.Object, mapper);
        }

        private Room ArrangeRoom(string status = RoomConstants.ActiveStatus, string roomType = RoomTypeConstants.GeneralTreatment)
        {
            var room = new Room { Id = 5, RoomName = "P.101", RoomType = roomType, Status = status, Floor = "1" };
            _roomRepositoryMock.Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(room);
            return room;
        }

        private void ArrangeUpcomingShifts(bool hasShifts)
        {
            _roomRepositoryMock
                .Setup(r => r.HasUpcomingShiftsAsync(5, It.IsAny<DateOnly>(), It.IsAny<TimeOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(hasShifts);
        }

        private static UpdateRoomRequest UpdateRequest(string status = RoomConstants.ActiveStatus, string roomType = RoomTypeConstants.GeneralTreatment)
        {
            return new UpdateRoomRequest { RoomName = "P.101", RoomType = roomType, Status = status, Floor = "1" };
        }

        [Fact]
        public async Task CreateRoomAsync_ShouldCreateActiveRoom_WithTrimmedValuesAndBlankFieldsAsNull()
        {
            Room? saved = null;
            _roomRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Room>(), It.IsAny<CancellationToken>()))
                .Callback<Room, CancellationToken>((room, _) => saved = room);

            var result = await _service.CreateRoomAsync(new CreateRoomRequest
            {
                RoomName = "  P.102  ",
                RoomType = RoomTypeConstants.XRay,
                Floor = "   ",
                Description = " Phòng chụp "
            });

            saved.Should().NotBeNull();
            saved!.RoomName.Should().Be("P.102");
            saved.Status.Should().Be(RoomConstants.ActiveStatus);
            saved.Floor.Should().BeNull();
            saved.Description.Should().Be("Phòng chụp");
            result.RoomName.Should().Be("P.102");
            _roomRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreateRoomAsync_ShouldThrow_WhenRoomTypeIsNotAllowed()
        {
            var act = () => _service.CreateRoomAsync(new CreateRoomRequest { RoomName = "P.103", RoomType = "Lab" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.RoomMessage.InvalidRoomType);
            _roomRepositoryMock.Verify(r => r.AddAsync(It.IsAny<Room>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task CreateRoomAsync_ShouldThrow_WhenRoomNameIsTaken()
        {
            _roomRepositoryMock.Setup(r => r.IsRoomNameInUseAsync("P.101", null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

            var act = () => _service.CreateRoomAsync(new CreateRoomRequest { RoomName = "P.101", RoomType = RoomTypeConstants.GeneralTreatment });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.RoomMessage.RoomNameExist);
        }

        [Fact]
        public async Task GetRoomByIdAsync_ShouldThrowNotFound_WhenRoomDoesNotExist()
        {
            var act = () => _service.GetRoomByIdAsync(99);

            await act.Should().ThrowAsync<NotFoundException>().WithMessage(ErrorConstants.RoomMessage.RoomNotFound);
        }

        [Fact]
        public async Task UpdateRoomAsync_ShouldThrow_WhenStatusIsNotAllowed()
        {
            ArrangeRoom();

            var act = () => _service.UpdateRoomAsync(5, UpdateRequest(status: "Closed"));

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.RoomMessage.InvalidStatus);
        }

        [Theory]
        [InlineData(RoomConstants.MaintenanceStatus, RoomTypeConstants.GeneralTreatment)]
        [InlineData(RoomConstants.InactiveStatus, RoomTypeConstants.GeneralTreatment)]
        [InlineData(RoomConstants.ActiveStatus, RoomTypeConstants.MinorSurgery)]
        public async Task UpdateRoomAsync_ShouldThrow_WhenRoomLeavesServiceOrChangesType_WithUpcomingShifts(string status, string roomType)
        {
            ArrangeRoom();
            ArrangeUpcomingShifts(true);

            var act = () => _service.UpdateRoomAsync(5, UpdateRequest(status, roomType));

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.RoomMessage.HasUpcomingShifts);
            _roomRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task UpdateRoomAsync_ShouldNotCheckShifts_WhenOnlyNameOrFloorChanges()
        {
            var room = ArrangeRoom();
            var request = UpdateRequest();
            request.RoomName = "P.101A";
            request.Floor = "2";

            var result = await _service.UpdateRoomAsync(5, request);

            result.RoomName.Should().Be("P.101A");
            room.Floor.Should().Be("2");
            room.UpdatedAt.Should().NotBeNull();
            _roomRepositoryMock.Verify(
                r => r.HasUpcomingShiftsAsync(It.IsAny<int>(), It.IsAny<DateOnly>(), It.IsAny<TimeOnly>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Theory]
        [InlineData("P.101")]
        [InlineData("p.101")]
        public async Task UpdateRoomAsync_ShouldSkipNameCheck_WhenNameIsUnchangedIgnoringCase(string roomName)
        {
            ArrangeRoom();
            var request = UpdateRequest();
            request.RoomName = roomName;

            await _service.UpdateRoomAsync(5, request);

            _roomRepositoryMock.Verify(
                r => r.IsRoomNameInUseAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task UpdateRoomAsync_ShouldThrow_WhenNewNameIsTaken()
        {
            ArrangeRoom();
            _roomRepositoryMock.Setup(r => r.IsRoomNameInUseAsync("P.202", 5, It.IsAny<CancellationToken>())).ReturnsAsync(true);
            var request = UpdateRequest();
            request.RoomName = "P.202";

            var act = () => _service.UpdateRoomAsync(5, request);

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.RoomMessage.RoomNameExist);
        }

        [Fact]
        public async Task UpdateRoomAsync_ShouldDeactivate_WhenNoUpcomingShifts()
        {
            var room = ArrangeRoom();
            ArrangeUpcomingShifts(false);

            var result = await _service.UpdateRoomAsync(5, UpdateRequest(status: RoomConstants.InactiveStatus));

            result.Status.Should().Be(RoomConstants.InactiveStatus);
            room.Status.Should().Be(RoomConstants.InactiveStatus);
            _roomRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task DeleteRoomAsync_ShouldThrow_WhenRoomIsUsedBySchedulesOrQueue()
        {
            ArrangeRoom();
            _roomRepositoryMock.Setup(r => r.IsRoomInUseAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(true);

            var act = () => _service.DeleteRoomAsync(5);

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.RoomMessage.RoomInUse);
            _roomRepositoryMock.Verify(r => r.Remove(It.IsAny<Room>()), Times.Never);
        }

        [Fact]
        public async Task DeleteRoomAsync_ShouldRemove_WhenRoomHasNoHistory()
        {
            var room = ArrangeRoom();

            await _service.DeleteRoomAsync(5);

            _roomRepositoryMock.Verify(r => r.Remove(room), Times.Once);
            _roomRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
