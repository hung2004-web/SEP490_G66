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
    }
}
