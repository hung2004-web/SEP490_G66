using System.Reflection;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Controllers;
using Xunit;

namespace OZE.UnitTest.Controllers
{
    // Who may use the follow-up endpoints. ASP.NET Core requires every [Authorize] on the class and the action,
    // so a class-level role would silently lock out the roles listed on an action.
    public class FollowUpsControllerTests
    {
        private readonly Mock<IExaminationService> _examinationServiceMock = new();

        [Fact]
        public void Controller_ShouldNotRestrictRolesAtClassLevel()
        {
            var attribute = typeof(FollowUpsController).GetCustomAttribute<AuthorizeAttribute>();

            attribute.Should().NotBeNull();
            attribute!.Roles.Should().BeNullOrEmpty();
        }

        [Theory]
        [InlineData(nameof(FollowUpsController.RemindFollowUpAsync))]
        [InlineData(nameof(FollowUpsController.RemindDueFollowUpsAsync))]
        public void Reminders_ShouldBeForReceptionistOnly(string action)
        {
            RolesOf(action).Should().BeEquivalentTo(RoleConstants.ReceptionistRole);
        }

        [Theory]
        [InlineData(nameof(FollowUpsController.GetFollowUpsAsync))]
        [InlineData(nameof(FollowUpsController.ScheduleFollowUpAsync))]
        public void ListAndBooking_ShouldBeForReceptionistAndDoctor_NotManager(string action)
        {
            RolesOf(action).Should().BeEquivalentTo(RoleConstants.ReceptionistRole, RoleConstants.DoctorRole);
        }

        [Fact]
        public void ExaminationsController_ShouldNoLongerExposeFollowUpListOrReminders()
        {
            var actions = typeof(ExaminationsController).GetMethods().Select(m => m.Name).ToList();

            actions.Should().NotContain(new[] { "GetFollowUpsAsync", "RemindFollowUpAsync", "RemindDueFollowUpsAsync", "ScheduleFollowUpAsync" });
            actions.Should().Contain("SetFollowUpAsync");
        }

        [Fact]
        public async Task GetFollowUpsAsync_Receptionist_ShouldSeeAllDoctors()
        {
            var controller = CreateController(RoleConstants.ReceptionistRole);

            await controller.GetFollowUpsAsync(new FollowUpQueryParameters(), CancellationToken.None);

            _examinationServiceMock.Verify(s => s.GetFollowUpsAsync(It.IsAny<FollowUpQueryParameters>(), null, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetFollowUpsAsync_Doctor_ShouldSeeOwnPatientsOnly()
        {
            var controller = CreateController(RoleConstants.DoctorRole);

            await controller.GetFollowUpsAsync(new FollowUpQueryParameters(), CancellationToken.None);

            _examinationServiceMock.Verify(s => s.GetFollowUpsAsync(It.IsAny<FollowUpQueryParameters>(), "user-1", It.IsAny<CancellationToken>()), Times.Once);
        }

        private static string[] RolesOf(string action)
        {
            var roles = typeof(FollowUpsController).GetMethod(action)!.GetCustomAttribute<AuthorizeAttribute>()!.Roles!;
            return roles.Split(',', StringSplitOptions.TrimEntries);
        }

        private FollowUpsController CreateController(string role)
        {
            _examinationServiceMock
                .Setup(s => s.GetFollowUpsAsync(It.IsAny<FollowUpQueryParameters>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new PagedResult<FollowUpListItemResponse>());

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user-1"),
                new Claim(ClaimTypes.Role, role)
            }, "TestAuth"));

            return new FollowUpsController(_examinationServiceMock.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = user } }
            };
        }
    }
}
