using FluentAssertions;
using Moq;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace OZE.UnitTest.Services.WorkShifts
{
    // OZ-WS-01 CreateWorkShift
    [Trait("Tab", "OZ-WS-01")]
    public class CreateWorkShiftTests : WorkShiftTestBase
    {
        // UTCID01 (N): Create shift with room, assignment, and note on a future date
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldCreateShiftSuccessfully_WhenAllDataIsValid()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            StaffSchedule? savedSchedule = null;

            _workShiftRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<StaffSchedule>()))
                .Callback<StaffSchedule>(s => savedSchedule = s)
                .Returns(Task.CompletedTask);

            // Act
            var result = await _service.CreateWorkShipAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.StaffUserId.Should().Be(ValidStaffUserId);
            result.StaffName.Should().Be("Bs. Nguyen Van A");
            result.RoomId.Should().Be(ValidRoomId);
            result.RoomName.Should().Be(ValidRoomName);
            result.ScheduleDate.Should().Be(request.ScheduleDate!.Value);
            result.ShiftStart.Should().Be(request.ShiftStart!.Value);
            result.ShiftEnd.Should().Be(request.ShiftEnd!.Value);
            result.Assignment.Should().Be("Kham rang tong quat");
            result.Notes.Should().Be("Truc ca sang");

            savedSchedule.Should().NotBeNull();
            savedSchedule!.StaffProfileId.Should().Be(ValidStaffProfileId);
            savedSchedule.RoomId.Should().Be(ValidRoomId);
            savedSchedule.Assignment.Should().Be("Kham rang tong quat");
            savedSchedule.Notes.Should().Be("Truc ca sang");

            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Once);
            _workShiftRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        // UTCID02 (N): Create shift without room (RoomId is null)
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldCreateShiftSuccessfully_WhenRoomIdIsNull()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.RoomId = null;

            // Act
            var result = await _service.CreateWorkShipAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.RoomId.Should().BeNull();
            result.RoomName.Should().BeNull();
            result.StaffUserId.Should().Be(ValidStaffUserId);

            _roomRepositoryMock.Verify(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
            _workShiftRepositoryMock.Verify(r => r.HasRoomOverlapAsync(It.IsAny<int>(), It.IsAny<DateOnly>(), It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), It.IsAny<long?>()), Times.Never);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.Is<StaffSchedule>(s => s.RoomId == null)), Times.Once);
            _workShiftRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        // UTCID03 (N): Create shift with whitespace in Assignment and Note -> fields trimmed
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldTrimAssignmentAndNote_WhenProvidedWithWhitespace()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.Assignment = "   Kham rang tong quat   ";
            request.Note = "   Truc ca sang dac biet   ";

            StaffSchedule? savedSchedule = null;
            _workShiftRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<StaffSchedule>()))
                .Callback<StaffSchedule>(s => savedSchedule = s)
                .Returns(Task.CompletedTask);

            // Act
            var result = await _service.CreateWorkShipAsync(request);

            // Assert
            result.Assignment.Should().Be("Kham rang tong quat");
            result.Notes.Should().Be("Truc ca sang dac biet");
            savedSchedule!.Assignment.Should().Be("Kham rang tong quat");
            savedSchedule.Notes.Should().Be("Truc ca sang dac biet");
        }

        // UTCID04 (B): ScheduleDate is clinic today (boundary case)
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldSucceed_WhenScheduleDateIsToday()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.ScheduleDate = TodayDate;

            // Act
            var result = await _service.CreateWorkShipAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.ScheduleDate.Should().Be(TodayDate);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Once);
            _workShiftRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        // UTCID05 (B): ScheduleDate is yesterday (boundary past date)
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowBadRequestException_WhenScheduleDateIsInThePast()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.ScheduleDate = YesterdayDate;

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.PastDate);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
            _workShiftRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Never);
        }

        // UTCID06 (B): ShiftStart equals ShiftEnd (boundary zero duration)
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowBadRequestException_WhenShiftStartEqualsShiftEnd()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.ShiftStart = new TimeOnly(8, 0);
            request.ShiftEnd = new TimeOnly(8, 0);

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.InvalidTimeRange);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }

        // UTCID07 (A): ShiftStart is later than ShiftEnd (inverted time range)
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowBadRequestException_WhenShiftStartIsAfterShiftEnd()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.ShiftStart = new TimeOnly(17, 0);
            request.ShiftEnd = new TimeOnly(8, 0);

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.InvalidTimeRange);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }

        // UTCID08 (A): Staff not found by StaffUserId
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowNotFoundException_WhenStaffNotFound()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.StaffUserId = "non-existent-user";

            _staffRepositoryMock
                .Setup(r => r.GetByUserIdAsync("non-existent-user"))
                .ReturnsAsync((StaffProfile?)null);

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.StaffNotFound);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }

        // UTCID09 (A): Staff account is inactive
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowBadRequestException_WhenStaffIsInactive()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();

            _staffRepositoryMock
                .Setup(r => r.GetByUserIdAsync(ValidStaffUserId))
                .ReturnsAsync(CreateSampleStaff(isActive: false));

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.StaffInactive);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }

        // UTCID10 (A): Room not found by RoomId
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowNotFoundException_WhenRoomNotFound()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();
            request.RoomId = 999;

            _roomRepositoryMock
                .Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Room?)null);

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.RoomNotFound);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }

        // UTCID11 (A): Room is not active
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowBadRequestException_WhenRoomIsNotActive()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();

            _roomRepositoryMock
                .Setup(r => r.GetByIdAsync(ValidRoomId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(CreateSampleRoom(isActive: false));

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.RoomNotActive);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }

        // UTCID12 (A): Staff has overlapping shift
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowBadRequestException_WhenStaffHasOverlappingShift()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();

            _workShiftRepositoryMock
                .Setup(r => r.HasOverlapAsync(ValidStaffProfileId, request.ScheduleDate!.Value, request.ShiftStart!.Value, request.ShiftEnd!.Value, null))
                .ReturnsAsync(true);

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.ShiftOverlap);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }

        // UTCID13 (A): Room is already used by another shift at that time
        [Fact]
        public async Task CreateWorkShiftAsync_ShouldThrowBadRequestException_WhenRoomHasOverlappingShift()
        {
            // Arrange
            SetupValidStaffAndRoom();
            var request = CreateValidRequest();

            _workShiftRepositoryMock
                .Setup(r => r.HasRoomOverlapAsync(ValidRoomId, request.ScheduleDate!.Value, request.ShiftStart!.Value, request.ShiftEnd!.Value, null))
                .ReturnsAsync(true);

            // Act
            var act = () => _service.CreateWorkShipAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.RoomOverlap);
            _workShiftRepositoryMock.Verify(r => r.AddAsync(It.IsAny<StaffSchedule>()), Times.Never);
        }
    }
}
