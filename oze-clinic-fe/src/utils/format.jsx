const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

const currencyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

const pad = (value) => String(value).padStart(2, "0");

export const toDateOnly = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateOnly = (value) => {
    if (!value) return null;
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

export const formatDate = (value) => {
    const date = parseDateOnly(value);
    return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : "";
};

export const formatWeekday = (value) => {
    const date = parseDateOnly(value);
    return date ? WEEKDAYS[date.getDay()] : "";
};

export const formatMonthShort = (value) => {
    const date = parseDateOnly(value);
    return date ? `Th ${date.getMonth() + 1}` : "";
};

export const formatTime = (value) => (value ? value.slice(0, 5) : "");

export const formatTimeRange = (start, end) => [formatTime(start), formatTime(end)].filter(Boolean).join(" – ");

export const formatCurrency = (amount) => (Number.isFinite(amount) ? currencyFormatter.format(amount) : "");

// Greeting by time of day: "Chào buổi sáng" before 12h, "Chào buổi chiều" before 18h, then "Chào buổi tối".
export const getGreeting = (date = new Date()) => {
    const hour = date.getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
};
