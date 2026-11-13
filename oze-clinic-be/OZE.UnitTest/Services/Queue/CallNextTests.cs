using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using System;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using OZE.UnitTest.Services.Appointments;
using Xunit;

namespace OZE.UnitTest.Services.Queue
{
    // OZ-Q-02 CallNext
    [Trait("Tab", "OZ-Q-02")]
    public class CallNextTests : AppointmentQueueTestBase
    {
        // UTCID01 (N): an enqueued patient gets a number and is called next
        [Fact]
        public async Task QueueService_ShouldEnqueueAndCallNext()
        {
            // Arrange
            var queueRepoMock = new Mock<IQueueRepository>();
            var loggerMock = new Mock<ILogger<QueueService>>();
            var queueService = new QueueService(queueRepoMock.Object, loggerMock.Object);

            // The repository gives the number together with saving
            queueRepoMock
                .Setup(r => r.AddWithNextNumberAsync(It.IsAny<QueueEntry>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((QueueEntry e, DateOnly _, CancellationToken _) =>
                {
                    e.QueueNumber = 5;
                    return e;
                });

            queueRepoMock
                .Setup(r => r.TryMarkCalledAsync(It.IsAny<long>(), It.IsAny<int?>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);
            queueRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.CheckInLateMinutes, It.IsAny<CancellationToken>()))
                .ReturnsAsync("15");

            // Act: Enqueue
            var entry = await queueService.EnqueueAsync(100, "Examination", roomId: 1, assignedStaffId: DoctorId, priority: 1);

            // Assert
            entry.QueueNumber.Should().Be(5);
            entry.Status.Should().Be("WAITING");

            // Arrange: CallNext
            queueRepoMock
                .Setup(r => r.GetActiveEntriesAsync("Examination", 1, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<QueueEntry> { entry });

            // Act: CallNext
            var called = await queueService.CallNextAsync("Examination", roomId: 1);

            // Assert
            called.Should().NotBeNull();
            called!.Status.Should().Be("CALLED");
            called.CalledAt.Should().NotBeNull();
        }

        // UTCID02 (N): a booked patient on time is called before a walk-in who checked in earlier (same order as the waiting list)
        [Fact]
        public async Task CallNextAsync_ShouldCallBookedPatientBeforeEarlierWalkIn()
        {
            var walkIn = Entry(1, queueNumber: 1, WalkInAppointment(101, checkInAt: At(8, 0)));
            var booked = Entry(2, queueNumber: 2, BookedAppointment(102, slot: new TimeOnly(8, 30), checkInAt: At(8, 20)));
            var service = CreateQueueService(walkIn, booked);

            var called = await service.CallNextAsync(QueueConstants.ExaminationType);

            called!.AppointmentId.Should().Be(102);
        }

        // UTCID03 (N): an urgent patient who missed a call is still called before normal patients
        [Fact]
        public async Task CallNextAsync_ShouldKeepUrgentPatientFirst_AfterMissedCall()
        {
            var normal = Entry(1, queueNumber: 1, BookedAppointment(101, slot: new TimeOnly(8, 0), checkInAt: At(7, 55)));
            var urgent = Entry(2, queueNumber: 2, BookedAppointment(102, slot: new TimeOnly(8, 0), checkInAt: At(7, 58), priority: 1), skipCount: 1);
            var service = CreateQueueService(normal, urgent);

            var called = await service.CallNextAsync(QueueConstants.ExaminationType);

            called!.AppointmentId.Should().Be(102);
        }

        // UTCID04 (B): inside the same priority and group, a patient who missed a call goes after one who did not
        [Fact]
        public async Task CallNextAsync_ShouldCallSkippedPatientAfterOthersOfSameGroup()
        {
            var skipped = Entry(1, queueNumber: 1, BookedAppointment(101, slot: new TimeOnly(8, 0), checkInAt: At(7, 50)), skipCount: 1);
            var notSkipped = Entry(2, queueNumber: 2, BookedAppointment(102, slot: new TimeOnly(9, 0), checkInAt: At(8, 50)));
            var service = CreateQueueService(skipped, notSkipped);

            var called = await service.CallNextAsync(QueueConstants.ExaminationType);

            called!.AppointmentId.Should().Be(102);
        }

        // UTCID05 (N): a patient back from the X-ray is called before booked patients on time
        [Fact]
        public async Task CallNextAsync_ShouldCallPatientBackFromXRayFirst()
        {
            var booked = Entry(1, queueNumber: 1, BookedAppointment(101, slot: new TimeOnly(8, 0), checkInAt: At(7, 55)));
            var backFromXRay = BookedAppointment(102, slot: new TimeOnly(8, 30), checkInAt: At(8, 25));
            backFromXRay.Examination = new Examination { Id = 900 };
            var service = CreateQueueService(booked, Entry(2, queueNumber: 7, backFromXRay));

            var called = await service.CallNextAsync(QueueConstants.ExaminationType);

            called!.AppointmentId.Should().Be(102);
        }

        // UTCID06 (B): a booked patient who checks in after the allowed delay (15 minutes) goes after booked patients on time
        [Fact]
        public async Task CallNextAsync_ShouldCallOnTimePatientBeforeLatePatient()
        {
            var late = Entry(1, queueNumber: 1, BookedAppointment(101, slot: new TimeOnly(8, 0), checkInAt: At(8, 16)));
            var onTime = Entry(2, queueNumber: 2, BookedAppointment(102, slot: new TimeOnly(8, 30), checkInAt: At(8, 20)));
            var service = CreateQueueService(late, onTime);

            var called = await service.CallNextAsync(QueueConstants.ExaminationType);

            called!.AppointmentId.Should().Be(102);
        }

        // ===== Shared test data =====

        private static readonly DateOnly ClinicToday = DateOnly.FromDateTime(ClinicClock.Today);

        // A check-in time today, in clinic time (UTC+7)
        private static DateTimeOffset At(int hour, int minute) =>
            new(ClinicToday.ToDateTime(new TimeOnly(hour, minute)), TimeSpan.FromHours(7));

        private static Appointment BookedAppointment(long id, TimeOnly slot, DateTimeOffset checkInAt, int priority = 0) => new()
        {
            Id = id,
            AppointmentType = AppointmentConstants.BookedType,
            AppointmentDate = ClinicToday,
            TimeSlotStart = slot,
            CheckInAt = checkInAt,
            Priority = priority,
            Status = AppointmentConstants.CheckedInStatus
        };

        private static Appointment WalkInAppointment(long id, DateTimeOffset checkInAt) => new()
        {
            Id = id,
            AppointmentType = AppointmentConstants.WalkInType,
            AppointmentDate = ClinicToday,
            CheckInAt = checkInAt,
            Status = AppointmentConstants.CheckedInStatus
        };

        private static QueueEntry Entry(long id, int queueNumber, Appointment appointment, int skipCount = 0) => new()
        {
            Id = id,
            AppointmentId = appointment.Id,
            Appointment = appointment,
            QueueType = QueueConstants.ExaminationType,
            QueueNumber = queueNumber,
            Priority = appointment.Priority,
            SkipCount = skipCount,
            Status = QueueConstants.Waiting
        };

        // The repository returns the entries in its own order (missed calls, priority, queue number), like the real one
        private static QueueService CreateQueueService(params QueueEntry[] entries)
        {
            var queueRepoMock = new Mock<IQueueRepository>();
            queueRepoMock
                .Setup(r => r.GetActiveEntriesAsync(QueueConstants.ExaminationType, null, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entries.OrderBy(e => e.SkipCount).ThenByDescending(e => e.Priority).ThenBy(e => e.QueueNumber).ToList());
            queueRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.CheckInLateMinutes, It.IsAny<CancellationToken>()))
                .ReturnsAsync("15");
            queueRepoMock
                .Setup(r => r.TryMarkCalledAsync(It.IsAny<long>(), It.IsAny<int?>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);
            return new QueueService(queueRepoMock.Object, Mock.Of<ILogger<QueueService>>());
        }
    }
}
