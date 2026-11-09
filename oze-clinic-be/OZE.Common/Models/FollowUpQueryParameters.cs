using System;

namespace OZE.Common.Models
{
    public class FollowUpQueryParameters
    {
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
        public int? DoctorId { get; set; }
        // true: only follow-ups that have an appointment scheduled; false: only those without an appointment scheduled; null: all
        public bool? HasAppointment { get; set; }
        public string? SearchKeyword { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
