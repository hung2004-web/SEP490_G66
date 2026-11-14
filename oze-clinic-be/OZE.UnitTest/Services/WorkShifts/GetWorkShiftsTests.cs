using FluentAssertions;
using Moq;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace OZE.UnitTest.Services.WorkShifts
{
    // OZ-WS-02 GetWorkShifts
    [Trait("Tab", "OZ-WS-02")]
    public class GetWorkShiftsTests : WorkShiftTestBase
    {
        // UTCID01 (N): Query with null dates -> defaults to current week (Monday to Sunday)
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldUseDefaultCurrentWeek_WhenFromDateAndToDateAreNull()
        {
            // Arrange
            var query = new WorkShiftQueryRequest
            {
                FromDate = null,
                ToDate = null
            };

            var expectedFromDate = StartOfCurrentWeek;
            var expectedToDate = expectedFromDate.AddDays(WorkShiftConstants.DaysInWeek - 1);

            var schedules = new List<StaffSchedule>
            {
                CreateSampleSchedule(1, expectedFromDate)
            };

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(expectedFromDate, expectedToDate, null, null))
                .ReturnsAsync(schedules);

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result[0].Id.Should().Be(1);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(expectedFromDate, expectedToDate, null, null), Times.Once);
        }

        // UTCID02 (N): Query with custom valid date range
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldFilterByCustomDateRange_WhenBothDatesProvided()
        {
            // Arrange
            var fromDate = TomorrowDate;
            var toDate = TomorrowDate.AddDays(14);
            var query = new WorkShiftQueryRequest
            {
                FromDate = fromDate,
                ToDate = toDate
            };

            var schedules = new List<StaffSchedule>
            {
                CreateSampleSchedule(1, fromDate),
                CreateSampleSchedule(2, toDate)
            };

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(fromDate, toDate, null, null))
                .ReturnsAsync(schedules);

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().HaveCount(2);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(fromDate, toDate, null, null), Times.Once);
        }

        // UTCID03 (N): Filter by StaffUserId
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldFilterByStaffUserId_WhenStaffUserIdProvided()
        {
            // Arrange
            var query = new WorkShiftQueryRequest
            {
                StaffUserId = ValidStaffUserId
            };

            var expectedFromDate = StartOfCurrentWeek;
            var expectedToDate = expectedFromDate.AddDays(WorkShiftConstants.DaysInWeek - 1);

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(expectedFromDate, expectedToDate, ValidStaffUserId, null))
                .ReturnsAsync(new List<StaffSchedule> { CreateSampleSchedule(1) });

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().HaveCount(1);
            result[0].StaffUserId.Should().Be(ValidStaffUserId);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(expectedFromDate, expectedToDate, ValidStaffUserId, null), Times.Once);
        }

        // UTCID04 (N): Filter by RoomId
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldFilterByRoomId_WhenRoomIdProvided()
        {
            // Arrange
            var query = new WorkShiftQueryRequest
            {
                RoomId = ValidRoomId
            };

            var expectedFromDate = StartOfCurrentWeek;
            var expectedToDate = expectedFromDate.AddDays(WorkShiftConstants.DaysInWeek - 1);

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(expectedFromDate, expectedToDate, null, ValidRoomId))
                .ReturnsAsync(new List<StaffSchedule> { CreateSampleSchedule(1) });

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().HaveCount(1);
            result[0].RoomId.Should().Be(ValidRoomId);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(expectedFromDate, expectedToDate, null, ValidRoomId), Times.Once);
        }

        // UTCID05 (N): Filter by all criteria (FromDate, ToDate, StaffUserId, RoomId)
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldFilterByAllCriteria_WhenAllFiltersProvided()
        {
            // Arrange
            var fromDate = TomorrowDate;
            var toDate = TomorrowDate.AddDays(3);
            var query = new WorkShiftQueryRequest
            {
                FromDate = fromDate,
                ToDate = toDate,
                StaffUserId = ValidStaffUserId,
                RoomId = ValidRoomId
            };

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(fromDate, toDate, ValidStaffUserId, ValidRoomId))
                .ReturnsAsync(new List<StaffSchedule> { CreateSampleSchedule(10, fromDate) });

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().HaveCount(1);
            result[0].Id.Should().Be(10);
            result[0].StaffUserId.Should().Be(ValidStaffUserId);
            result[0].RoomId.Should().Be(ValidRoomId);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(fromDate, toDate, ValidStaffUserId, ValidRoomId), Times.Once);
        }

        // UTCID06 (N): Return empty list when no shifts match
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldReturnEmptyList_WhenNoShiftsFound()
        {
            // Arrange
            var query = new WorkShiftQueryRequest();
            var expectedFromDate = StartOfCurrentWeek;
            var expectedToDate = expectedFromDate.AddDays(WorkShiftConstants.DaysInWeek - 1);

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(expectedFromDate, expectedToDate, null, null))
                .ReturnsAsync(new List<StaffSchedule>());

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().NotBeNull();
            result.Should().BeEmpty();
        }

        // UTCID07 (N): Mapping verification including shifts without assigned room
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldMapFieldsCorrectly_IncludingShiftsWithoutRoom()
        {
            // Arrange
            var shiftWithRoom = CreateSampleSchedule(1, TomorrowDate);
            var shiftWithoutRoom = new StaffSchedule
            {
                Id = 2,
                StaffProfileId = ValidStaffProfileId,
                StaffProfile = CreateSampleStaff(),
                RoomId = null,
                Room = null,
                ScheduleDate = TomorrowDate.AddDays(1),
                ShiftStart = new TimeOnly(13, 0),
                ShiftEnd = new TimeOnly(17, 0),
                Assignment = "Truc le tan",
                Notes = "Khong can phong",
                IsPresent = false,
                AbsenceReason = "Phep nam",
                ActualStartTime = null,
                ActualEndTime = null,
                CreatedAt = DateTimeOffset.UtcNow
            };

            var query = new WorkShiftQueryRequest
            {
                FromDate = TomorrowDate,
                ToDate = TomorrowDate.AddDays(2)
            };

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(TomorrowDate, TomorrowDate.AddDays(2), null, null))
                .ReturnsAsync(new List<StaffSchedule> { shiftWithRoom, shiftWithoutRoom });

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().HaveCount(2);

            // Item 1: With room
            result[0].Id.Should().Be(1);
            result[0].StaffUserId.Should().Be(ValidStaffUserId);
            result[0].StaffName.Should().Be("Bs. Nguyen Van A");
            result[0].RoomId.Should().Be(ValidRoomId);
            result[0].RoomName.Should().Be(ValidRoomName);
            result[0].IsPresent.Should().BeTrue();
            result[0].ActualStartTime.Should().Be(new TimeOnly(7, 55));
            result[0].ActualEndTime.Should().Be(new TimeOnly(12, 5));

            // Item 2: Without room
            result[1].Id.Should().Be(2);
            result[1].RoomId.Should().BeNull();
            result[1].RoomName.Should().BeNull();
            result[1].Assignment.Should().Be("Truc le tan");
            result[1].Notes.Should().Be("Khong can phong");
            result[1].IsPresent.Should().BeFalse();
            result[1].AbsenceReason.Should().Be("Phep nam");
        }

        // UTCID08 (B): FromDate equals ToDate (single-day boundary case)
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldSucceed_WhenFromDateEqualsToDate()
        {
            // Arrange
            var singleDate = TomorrowDate;
            var query = new WorkShiftQueryRequest
            {
                FromDate = singleDate,
                ToDate = singleDate
            };

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(singleDate, singleDate, null, null))
                .ReturnsAsync(new List<StaffSchedule> { CreateSampleSchedule(1, singleDate) });

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().HaveCount(1);
            result[0].ScheduleDate.Should().Be(singleDate);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(singleDate, singleDate, null, null), Times.Once);
        }

        // UTCID09 (B): Only FromDate provided -> ToDate defaults to 7 days from FromDate
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldDefaultToDateTo7DaysFromProvidedFromDate_WhenOnlyFromDateProvided()
        {
            // Arrange
            var fromDate = TomorrowDate;
            var expectedToDate = fromDate.AddDays(WorkShiftConstants.DaysInWeek - 1);
            var query = new WorkShiftQueryRequest
            {
                FromDate = fromDate,
                ToDate = null
            };

            _workShiftRepositoryMock
                .Setup(r => r.GetAllAsync(fromDate, expectedToDate, null, null))
                .ReturnsAsync(new List<StaffSchedule>());

            // Act
            var result = await _service.GetWorkShiftsAsync(query);

            // Assert
            result.Should().NotBeNull();
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(fromDate, expectedToDate, null, null), Times.Once);
        }

        // UTCID10 (B): ToDate is exactly one day earlier than FromDate (boundary invalid range)
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldThrowBadRequestException_WhenToDateIsExactlyOneDayBeforeFromDate()
        {
            // Arrange
            var fromDate = TomorrowDate;
            var toDate = fromDate.AddDays(-1);
            var query = new WorkShiftQueryRequest
            {
                FromDate = fromDate,
                ToDate = toDate
            };

            // Act
            var act = () => _service.GetWorkShiftsAsync(query);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.InvalidDateRange);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), It.IsAny<int?>()), Times.Never);
        }

        // UTCID11 (A): FromDate is strictly greater than ToDate (invalid range)
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldThrowBadRequestException_WhenFromDateIsAfterToDate()
        {
            // Arrange
            var fromDate = TomorrowDate.AddDays(10);
            var toDate = TomorrowDate;
            var query = new WorkShiftQueryRequest
            {
                FromDate = fromDate,
                ToDate = toDate
            };

            // Act
            var act = () => _service.GetWorkShiftsAsync(query);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.InvalidDateRange);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), It.IsAny<int?>()), Times.Never);
        }

        // UTCID12 (A): Only ToDate provided and it is before default FromDate (start of week)
        [Fact]
        public async Task GetWorkShiftsAsync_ShouldThrowBadRequestException_WhenOnlyToDateProvidedAndItIsBeforeStartOfWeek()
        {
            // Arrange: FromDate will default to StartOfCurrentWeek
            var toDate = StartOfCurrentWeek.AddDays(-1);
            var query = new WorkShiftQueryRequest
            {
                FromDate = null,
                ToDate = toDate
            };

            // Act
            var act = () => _service.GetWorkShiftsAsync(query);

            // Assert
            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.InvalidDateRange);
            _workShiftRepositoryMock.Verify(r => r.GetAllAsync(It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), It.IsAny<int?>()), Times.Never);
        }
    }
}
