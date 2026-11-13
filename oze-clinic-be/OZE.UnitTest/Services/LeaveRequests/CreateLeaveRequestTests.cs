using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.LeaveRequests
{
    // OZ-LEAVE-01 CreateLeaveRequest (gửi và rút đơn xin nghỉ)
    [Trait("Tab", "OZ-LEAVE-01")]
    public class CreateLeaveRequestTests : LeaveRequestTestBase
    {
        // UTCID01 (N): a morning leave on a day with a morning shift is created as Pending
        [Fact]
        public async Task Create_MorningWithShift_CreatesPending()
        {
            GivenShifts(Shift(8, 12), Shift(13, 17));
            LeaveRequest? added = null;
            _leaveRepo.Setup(r => r.AddAsync(It.IsAny<LeaveRequest>(), It.IsAny<CancellationToken>()))
                      .Callback<LeaveRequest, CancellationToken>((x, _) => added = x);

            var result = await _service.CreateAsync(StaffUserId,
                new CreateLeaveRequestRequest { LeaveDate = _leaveDate, Slot = "morning", Reason = "Kham suc khoe" });

            added!.Status.Should().Be(LeaveRequestConstants.Pending);
            added.Slot.Should().Be(LeaveRequestConstants.SlotMorning);
            result.StaffRole.Should().Be(RoleConstants.DoctorRole);
        }

        // UTCID02 (A): no shift in that time means nothing to take leave from
        [Fact]
        public async Task Create_NoShiftInSlot_Throws()
        {
            GivenShifts(Shift(13, 17));

            var act = () => _service.CreateAsync(StaffUserId,
                new CreateLeaveRequestRequest { LeaveDate = _leaveDate, Slot = "Morning", Reason = "Ly do" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.NoShiftToLeave);
        }

        // UTCID03 (A): a past date is refused
        [Fact]
        public async Task Create_PastDate_Throws()
        {
            var act = () => _service.CreateAsync(StaffUserId,
                new CreateLeaveRequestRequest { LeaveDate = _leaveDate.AddDays(-10), Reason = "Ly do" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.DateInPast);
        }

        // UTCID04 (A): a second request over the same time is refused
        [Fact]
        public async Task Create_Overlapping_Throws()
        {
            GivenShifts(Shift(8, 12));
            _leaveRepo.Setup(r => r.HasActiveOverlapAsync(_staff.Id, _leaveDate, null, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

            var act = () => _service.CreateAsync(StaffUserId, new CreateLeaveRequestRequest { LeaveDate = _leaveDate, Reason = "Ly do" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.AlreadyRequested);
        }

        // UTCID05 (A): an unknown slot value is refused
        [Fact]
        public async Task Create_InvalidSlot_Throws()
        {
            var act = () => _service.CreateAsync(StaffUserId,
                new CreateLeaveRequestRequest { LeaveDate = _leaveDate, Slot = "Evening", Reason = "Ly do" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.SlotInvalid);
        }

        // UTCID06 (A): only the owner can cancel, and only while pending
        [Fact]
        public async Task Cancel_NotOwner_Forbidden()
        {
            var leave = PendingLeave();

            var act = () => _service.CancelAsync("someone-else", leave.Id);

            await act.Should().ThrowAsync<ForbiddenException>();
        }
    }
}
