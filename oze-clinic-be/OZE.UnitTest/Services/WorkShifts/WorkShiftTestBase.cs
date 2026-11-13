using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using System;

namespace OZE.UnitTest.Services.WorkShifts
{
    // Shared mocks, setup and test data for WorkShift tests. Holds no tests itself.
    public abstract class WorkShiftTestBase
    {
        protected readonly Mock<IWorkShiftRepository> _workShiftRepositoryMock;
        protected readonly Mock<IStaffRepository> _staffRepositoryMock;
        protected readonly Mock<IRoomRepository> _roomRepositoryMock;
        protected readonly WorkShiftService _service;

        protected const string ValidStaffUserId = "staff-user-1";
        protected const int ValidStaffProfileId = 10;
        protected const int ValidRoomId = 5;
        protected const string ValidRoomName = "Phong Kham 101";

        protected WorkShiftTestBase()
        {
            _workShiftRepositoryMock = new Mock<IWorkShiftRepository>();
            _staffRepositoryMock = new Mock<IStaffRepository>();
            _roomRepositoryMock = new Mock<IRoomRepository>();

            _service = new WorkShiftService(
                _workShiftRepositoryMock.Object,
                _staffRepositoryMock.Object,
                _roomRepositoryMock.Object);
        }

        protected static DateOnly TodayDate => DateOnly.FromDateTime(ClinicClock.Today);
        protected static DateOnly TomorrowDate => TodayDate.AddDays(1);
        protected static DateOnly YesterdayDate => TodayDate.AddDays(-1);

        protected StaffProfile CreateSampleStaff(bool isActive = true)
        {
            return new StaffProfile
            {
                Id = ValidStaffProfileId,
                UserId = ValidStaffUserId,
                FullName = "Bs. Nguyen Van A",
                PhoneNumber = "0912345678",
                IsActive = isActive,
                CreatedAt = DateTimeOffset.UtcNow
            };
        }

        protected Room CreateSampleRoom(bool isActive = true)
        {
            return new Room
            {
                Id = ValidRoomId,
                RoomName = ValidRoomName,
                RoomType = "GeneralTreatment",
                Status = isActive ? RoomConstants.ActiveStatus : "Inactive",
                CreatedAt = DateTimeOffset.UtcNow
            };
        }

        protected CreateWorkShiftRequest CreateValidRequest()
        {
            return new CreateWorkShiftRequest
            {
                StaffUserId = ValidStaffUserId,
                ScheduleDate = TomorrowDate,
                ShiftStart = new TimeOnly(8, 0),
                ShiftEnd = new TimeOnly(12, 0),
                RoomId = ValidRoomId,
                Assignment = "Kham rang tong quat",
                Note = "Truc ca sang"
            };
        }

        protected void SetupValidStaffAndRoom()
        {
            _staffRepositoryMock
                .Setup(r => r.GetByUserIdAsync(ValidStaffUserId))
                .ReturnsAsync(CreateSampleStaff(isActive: true));

            _roomRepositoryMock
                .Setup(r => r.GetByIdAsync(ValidRoomId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(CreateSampleRoom(isActive: true));

            _workShiftRepositoryMock
                .Setup(r => r.HasOverlapAsync(It.IsAny<int>(), It.IsAny<DateOnly>(), It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), It.IsAny<long?>()))
                .ReturnsAsync(false);

            _workShiftRepositoryMock
                .Setup(r => r.HasRoomOverlapAsync(It.IsAny<int>(), It.IsAny<DateOnly>(), It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), It.IsAny<long?>()))
                .ReturnsAsync(false);

            _workShiftRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<StaffSchedule>()))
                .Returns(Task.CompletedTask);

            _workShiftRepositoryMock
                .Setup(r => r.SaveChangesAsync())
                .Returns(Task.CompletedTask);
        }
    }
}
