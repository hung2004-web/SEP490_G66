using OZE.Common.Constants;
using OZE.Domain.Entities;

namespace OZE.Application.Helpers
{
    // The one waiting order of the examination queue. The waiting list shows it and "call next" calls the first
    // waiting patient in it, so the patient on top of the screen is always the one who is called.
    //   1. Higher priority first (Urgent before Normal)
    //   2. Group: back from the X-ray, booked and on time, booked and late, walk-in
    //   3. A patient who was called and not there goes after the others of the same priority and group
    //   4. On time: by booked time; the other groups: by check-in time
    public static class WaitingOrder
    {
        public const int PriorityReturnGroup = 0;
        public const int OnTimeGroup = 1;
        public const int LateGroup = 2;
        public const int WalkInGroup = 3;

        public static List<T> Sort<T>(IEnumerable<T> items, Func<T, Appointment?> appointmentOf, Func<T, int> skipCountOf, int lateMinutes)
        {
            return items
                .Select(item => (Item: item, Appointment: appointmentOf(item)))
                .OrderBy(x => x.Appointment == null)
                .ThenByDescending(x => x.Appointment?.Priority ?? 0)
                .ThenBy(x => x.Appointment == null ? WalkInGroup : GetGroup(x.Appointment, lateMinutes))
                .ThenBy(x => skipCountOf(x.Item))
                .ThenBy(x => x.Appointment != null && GetGroup(x.Appointment, lateMinutes) == OnTimeGroup
                    ? x.Appointment.TimeSlotStart
                    : null)
                .ThenBy(x => x.Appointment?.CheckInAt)
                .ThenBy(x => x.Appointment?.Id)
                .Select(x => x.Item)
                .ToList();
        }

        public static int GetGroup(Appointment appointment, int lateMinutes)
        {
            if (appointment.Examination != null)
            {
                return PriorityReturnGroup;
            }

            if (appointment.AppointmentType == AppointmentConstants.WalkInType)
            {
                return WalkInGroup;
            }

            return IsLateCheckIn(appointment, lateMinutes) ? LateGroup : OnTimeGroup;
        }

        // Arriving early is never late; only a check-in after the booked time plus the allowed delay is.
        // The booked time is clinic time, so the check-in time is read in clinic time too
        public static bool IsLateCheckIn(Appointment appointment, int lateMinutes)
        {
            if (appointment.CheckInAt == null || appointment.TimeSlotStart == null)
            {
                return false;
            }

            var bookedAt = appointment.AppointmentDate.ToDateTime(appointment.TimeSlotStart.Value);
            return ClinicClock.ToClinicTime(appointment.CheckInAt.Value) > bookedAt.AddMinutes(lateMinutes);
        }

        // Missed calls of the patient's current examination queue entry (0 when not queued)
        public static int SkipCountOf(Appointment appointment)
        {
            return appointment.QueueEntries
                .Where(q => q.QueueType == QueueConstants.ExaminationType && QueueConstants.ActiveStatuses.Contains(q.Status))
                .OrderByDescending(q => q.CreatedAt)
                .Select(q => q.SkipCount)
                .FirstOrDefault();
        }
    }
}
