using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Constants
{
    public static class ConfigKeyConstants
    {
        public const string BookingMaxDaysAhead = "Booking.MaxDaysAhead";
        public const string BookingMinHoursAhead = "Booking.MinHoursAhead";
        // A patient cannot cancel online when the appointment starts in fewer hours than this
        public const string BookingCancelCutoffHours = "Booking.CancelCutoffHours";
        public const string SlotDurationMinutes = "Clinic.SlotDurationMinutes";
        // Code of the service that every appointment starts with
        public const string GeneralExamServiceCode = "Booking.GeneralExamServiceCode";
        // A booked patient who checks in more than this many minutes after the slot start is "late" in the waiting list
        public const string CheckInLateMinutes = "CheckIn.LateMinutes";
        // A PENDING appointment not confirmed within this many hours of being booked (or rescheduled) is overdue
        public const string BookingPendingConfirmHours = "Booking.PendingConfirmHours";
        // A PENDING appointment whose visit starts within this many hours is overdue, however recently it was booked
        public const string BookingPendingVisitSoonHours = "Booking.PendingVisitSoonHours";
    }
}
