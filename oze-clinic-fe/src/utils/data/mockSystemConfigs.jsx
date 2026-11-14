// Mock rows of the SystemConfigurations table for the clinic manager's "Cấu hình hệ thống" page.
// TODO(api): the backend has no system configuration endpoints yet.

export const CONFIG_GROUPS = [
    { key: "booking", title: "Đặt lịch hẹn" },
    { key: "checkIn", title: "Check-in" },
    { key: "queue", title: "Hàng chờ" },
    { key: "clinic", title: "Giờ làm việc" },
];

// dataType: "int" (whole number, with unit and min / max) or "time" ("HH:mm"). value is the stored value as text.
export const MOCK_SYSTEM_CONFIGS = [
    { key: "Booking.MaxDaysAhead", group: "booking", label: "Đặt lịch trước tối đa", dataType: "int", unit: "ngày", min: 1, max: 365, value: "30" },
    { key: "Booking.MinHoursAhead", group: "booking", label: "Đặt trước giờ hẹn ít nhất", dataType: "int", unit: "giờ", min: 0, max: 72, value: "2" },
    { key: "Booking.CancelCutoffHours", group: "booking", label: "Bệnh nhân tự huỷ trước giờ hẹn ít nhất", dataType: "int", unit: "giờ", min: 0, max: 168, value: "24" },
    { key: "CheckIn.EarlyMinutes", group: "checkIn", label: "Cho check-in sớm tối đa", dataType: "int", unit: "phút", min: 0, max: 240, value: "30" },
    { key: "CheckIn.LateMinutes", group: "checkIn", label: "Trễ quá thì đánh dấu NO_SHOW", dataType: "int", unit: "phút", min: 0, max: 240, value: "15" },
    { key: "Queue.AutoExpireMinutes", group: "queue", label: "Chờ quá thì tự huỷ khỏi hàng chờ", dataType: "int", unit: "phút", min: 5, max: 480, value: "60" },
    { key: "Clinic.WorkStartTime", group: "clinic", label: "Giờ mở cửa", dataType: "time", value: "08:00" },
    { key: "Clinic.WorkEndTime", group: "clinic", label: "Giờ đóng cửa", dataType: "time", value: "19:00" },
    { key: "Clinic.SlotDurationMinutes", group: "clinic", label: "Độ dài một khung giờ hẹn", dataType: "int", unit: "phút", min: 5, max: 240, value: "30" },
];
