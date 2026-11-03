using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class WorkShipResponse
    {
        public long Id { get; set; }
        public string StaffUserId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        public DateOnly ScheduleDate { get; set; }
        public TimeOnly ShiftStart { get; set; }
        public TimeOnly ShiftEnd { get; set; }
        public string? Assignment { get; set; }
        public bool? IsPresent { get; set; }
        public string? AbsenceReason { get; set; }
        // Clock in and clock out of the doctor, null until the doctor starts or ends the shift;
        // a shift with an end time is the one the manager can reopen
        public TimeOnly? ActualStartTime { get; set; }
        public TimeOnly? ActualEndTime { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt
        {
            get; set;
        }
    }
}
