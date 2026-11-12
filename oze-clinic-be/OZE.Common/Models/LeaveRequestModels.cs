using System.ComponentModel.DataAnnotations;
using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class CreateLeaveRequestRequest
    {
        [Required]
        public DateOnly? LeaveDate { get; set; }

        // Morning, Afternoon, or empty for the whole day
        public string? Slot { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }

    public class ApproveLeaveRequestRequest
    {
        // Who takes over the shifts. Required when the shifts already have booked appointments.
        public string? SubstituteStaffUserId { get; set; }
    }

    public class RejectLeaveRequestRequest
    {
        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }

    public class LeaveRequestQuery : PagedRequestBase
    {
        public string? Status { get; set; }
        // Doctor, Receptionist, DentalImagingTechnician
        public string? Role { get; set; }
        // Morning, Afternoon or WholeDay
        public string? Slot { get; set; }
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
    }

    public class LeaveShiftItem
    {
        public long ShiftId { get; set; }
        public TimeOnly ShiftStart { get; set; }
        public TimeOnly ShiftEnd { get; set; }
        public string? RoomName { get; set; }
    }

    public class LeaveAppointmentItem
    {
        public long Id { get; set; }
        public TimeOnly? Time { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string? ServiceName { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class LeaveRequestResponse
    {
        public long Id { get; set; }
        public string StaffUserId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string? StaffRole { get; set; }
        public DateOnly LeaveDate { get; set; }
        public string? Slot { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? SubstituteStaffUserId { get; set; }
        public string? SubstituteName { get; set; }
        public DateTimeOffset? ReviewedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public List<LeaveShiftItem> AffectedShifts { get; set; } = new();
        public List<LeaveAppointmentItem> AffectedAppointments { get; set; } = new();
    }

    public class SubstituteOption
    {
        public string StaffUserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
    }

    public class LeaveRequestDetailResponse
    {
        public LeaveRequestResponse Request { get; set; } = new();
        // Staff of the same role who are free for the whole leave time; empty once the request is decided
        public List<SubstituteOption> SubstituteOptions { get; set; } = new();
    }
}
