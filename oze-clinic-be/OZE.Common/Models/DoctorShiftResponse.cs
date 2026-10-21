using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class DoctorShiftResponse
    {
        public long Id { get; set; }
        public DateOnly ScheduleDate { get; set; }
        public TimeOnly ShiftStart { get; set; }
        public TimeOnly ShiftEnd { get; set; }
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        public string? Assignment { get; set; }
        // null: not checked yet, true: present, false: absent
        public bool? IsPresent { get; set; }
        public string? AbsenceReason { get; set; }
        public int AppointmentCount { get; set; }
        public List<DoctorAppointmentResponse> Appointments { get; set; } = new();
    }
}
