using System.Globalization;
using OZE.Common.Constants;

namespace OZE.Application.Helpers
{
    // How numbers, dates and times are written inside notification texts
    public static class NotificationFormat
    {
        private static readonly CultureInfo Vietnamese = CultureInfo.GetCultureInfo("vi-VN");

        public static string Money(decimal amount) => string.Format(Vietnamese, "{0:N0} ₫", amount);
        public static string Time(TimeOnly? time) => time?.ToString("HH:mm") ?? string.Empty;
        public static string Date(DateOnly date) => date.ToString("dd/MM/yyyy");

        // Leave slot: morning, afternoon or the whole day
        public static string LeaveSlot(string? slot) => slot switch
        {
            LeaveRequestConstants.SlotMorning => "buổi sáng",
            LeaveRequestConstants.SlotAfternoon => "buổi chiều",
            _ => "cả ngày"
        };
    }
}
