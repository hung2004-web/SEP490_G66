using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class CreateWorkShipRequest
    {
        [Required]
        public int StaffUserId { get; set; }
        [Required]
        public DateOnly ScheduleDate { get; set; }
        [Required]
        public TimeOnly ShiftStart {get; set;}
        [Required]
        public TimeOnly ShiftEnd { get; set; }
        public int? RoomId { get; set; }
        public string? Assignment { get; set; }
        public string? Note { get; set; }

    }
}
