using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // Shared mocks, setup and test data for the Appointments tests. Holds no tests itself.
    public abstract class AppointmentQueueTestBase
    {
        protected const int DoctorId = 10;
        protected const string DoctorUserId = "doc-user-10";
        protected static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

        protected readonly Mock<IAppointmentRepository> _appointmentRepoMock = new();
        protected readonly Mock<IAuditLogService> _auditLogMock = new();
        protected readonly Mock<IQueueService> _queueServiceMock = new();
        protected readonly AppointmentService _service;

        protected AppointmentQueueTestBase()
        {
            _service = new AppointmentService(
                _appointmentRepoMock.Object,
                new Mock<IRegistrationRepository>().Object,
                new Mock<IServiceRepository>().Object,
                new Mock<ISmsSender>().Object,
                new Mock<IEmailSender>().Object,
                _auditLogMock.Object,
                new Mock<ILogger<AppointmentService>>().Object,
                _queueServiceMock.Object);

            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.CheckInLateMinutes))
                .ReturnsAsync("15");

            _appointmentRepoMock
                .Setup(r => r.GetStaffProfileIdByUserIdAsync(DoctorUserId))
                .ReturnsAsync(DoctorId);
        }
    }
}
