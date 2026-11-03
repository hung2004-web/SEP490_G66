const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

const currencyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

const CLINIC_TIME_ZONE = "Asia/Ho_Chi_Minh";

const CLINIC_UTC_OFFSET = "+07:00";

const clinicPartsFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: CLINIC_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});

const pad = (value) => String(value).padStart(2, "0");

const getClinicParts = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return Object.fromEntries(clinicPartsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
};

export const toDateOnly = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Monday of the week containing date, as "YYYY-MM-DD".
export const getWeekStart = (date = new Date()) =>
    toDateOnly(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)));

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

export const toClinicDateTime = (dateOnly, time) => {
    if (!dateOnly || !time) return null;
    const date = new Date(`${String(dateOnly).slice(0, 10)}T${time}${CLINIC_UTC_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const getClinicToday = () => {
    const parts = getClinicParts(new Date());
    return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatDateTime = (value) => {
    const parts = value ? getClinicParts(value) : null;
    return parts ? `${parts.hour}:${parts.minute}, ${parts.day}/${parts.month}/${parts.year}` : "";
};

export const formatClock = (value) => {
    const parts = value ? getClinicParts(value) : null;
    return parts ? `${parts.hour}:${parts.minute}` : "";
};

// Greeting by time of day: "Chào buổi sáng" before 12h, "Chào buổi chiều" before 18h, then "Chào buổi tối".
export const getGreeting = (date = new Date()) => {
    const hour = date.getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
};
