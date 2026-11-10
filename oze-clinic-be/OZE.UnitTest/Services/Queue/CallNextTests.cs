using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using System;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
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
    }
}
