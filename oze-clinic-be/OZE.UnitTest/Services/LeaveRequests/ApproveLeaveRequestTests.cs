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
    // OZ-LEAVE-02 ApproveLeaveRequest (duyệt và từ chối đơn xin nghỉ)
    [Trait("Tab", "OZ-LEAVE-02")]
    public class ApproveLeaveRequestTests : LeaveRequestTestBase
    {
        // UTCID01 (N): approving without a substitute marks the shifts absent when nothing is booked
        [Fact]
        public async Task Approve_NoAppointments_MarksShiftsAbsent()
        {
            var leave = PendingLeave();
            var morning = Shift(8, 12);
            GivenShifts(morning);

            await _service.ApproveAsync(ManagerId, leave.Id, new ApproveLeaveRequestRequest());

            leave.Status.Should().Be(LeaveRequestConstants.Approved);
            leave.ReviewedByUserId.Should().Be(ManagerId);
            morning.IsPresent.Should().BeFalse();
            morning.AbsenceReason.Should().Contain(leave.Reason);
        }

        // UTCID02 (A): booked patients in the shift need a substitute first
        [Fact]
        public async Task Approve_AppointmentsWithoutSubstitute_Throws()
        {
            var leave = PendingLeave();
            GivenShifts(Shift(8, 12));
            GivenAppointments(Booked(9));

            var act = () => _service.ApproveAsync(ManagerId, leave.Id, new ApproveLeaveRequestRequest());

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.SubstituteRequired);
            leave.Status.Should().Be(LeaveRequestConstants.Pending);
        }

        // UTCID03 (N): with a substitute the shift and its booked patients move to the substitute
        [Fact]
        public async Task Approve_WithSubstitute_MovesShiftAndAppointments()
        {
            var leave = PendingLeave();
            var morning = Shift(8, 12);
            var appointment = Booked(9);
            GivenShifts(morning);
            GivenAppointments(appointment);

            await _service.ApproveAsync(ManagerId, leave.Id, new ApproveLeaveRequestRequest { SubstituteStaffUserId = SubstituteUserId });

            morning.StaffProfileId.Should().Be(_substitute.Id);
            appointment.DoctorId.Should().Be(_substitute.Id);
            leave.SubstituteStaffProfileId.Should().Be(_substitute.Id);
        }

        // UTCID04 (A): a substitute who already works at that time is refused
        [Fact]
        public async Task Approve_BusySubstitute_Throws()
        {
            var leave = PendingLeave();
            GivenShifts(Shift(8, 12));
            _shiftRepo.Setup(r => r.HasOverlapAsync(_substitute.Id, _leaveDate, It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), null)).ReturnsAsync(true);

            var act = () => _service.ApproveAsync(ManagerId, leave.Id, new ApproveLeaveRequestRequest { SubstituteStaffUserId = SubstituteUserId });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.SubstituteBusy);
        }

        // UTCID05 (A): rejecting needs a reason
        [Fact]
        public async Task Reject_NoReason_Throws()
        {
            var leave = PendingLeave();

            var act = () => _service.RejectAsync(ManagerId, leave.Id, new RejectLeaveRequestRequest { Reason = " " });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.RejectReasonRequired);
        }

        // UTCID06 (A): a decided request cannot be decided again
        [Fact]
        public async Task Approve_AlreadyRejected_Throws()
        {
            var leave = PendingLeave();
            leave.Status = LeaveRequestConstants.Rejected;

            var act = () => _service.ApproveAsync(ManagerId, leave.Id, new ApproveLeaveRequestRequest());

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.LeaveRequestMessage.NotPending);
        }
    }
}
