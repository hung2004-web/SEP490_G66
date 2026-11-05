import { getClinicToday, parseDateOnly } from "@/utils/format";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEBT_STATUSES = {
    PARTIALLY_PAID: "partially_paid",
    PENDING: "pending",
    UNPAID: "unpaid",
};

export const DEBT_STATUS_LABELS = {
    [DEBT_STATUSES.PARTIALLY_PAID]: { label: "Thanh toán một phần", badge: "badge-warning" },
    [DEBT_STATUSES.PENDING]: { label: "Chờ xác nhận", badge: "badge-warning" },
    [DEBT_STATUSES.UNPAID]: { label: "Chưa thanh toán", badge: "badge-danger" },
};

export const DEBT_PAYMENT_STATUSES = {
    CONFIRMED: "confirmed",
    FAILED: "failed",
};

export const DEBT_PAYMENT_STATUS_LABELS = {
    [DEBT_PAYMENT_STATUSES.CONFIRMED]: { label: "Đã xác nhận", badge: "badge-success" },
    [DEBT_PAYMENT_STATUSES.FAILED]: { label: "Thất bại", badge: "badge-danger" },
};

// How a debt is coloured once it is older than `days`. Oldest level first, which is the order getDebtAgeLevel checks.
export const DEBT_AGE_LEVELS = [
    {
        days: 60,
        row: "bg-danger-soft hover:bg-danger-soft",
        edge: "border-l-3 border-l-danger-solid",
        date: "font-semibold text-danger",
        swatch: "border-danger-solid bg-danger-soft",
    },
    {
        days: 30,
        row: "bg-warning-soft hover:bg-warning-soft",
        edge: "border-l-3 border-l-warning-solid",
        date: "font-semibold text-warning",
        swatch: "border-warning-solid bg-warning-soft",
    },
];

// The level of a debt created on createdAt, or null while it is 30 days old or less.
export const getDebtAgeLevel = (createdAt) => {
    const created = parseDateOnly(createdAt);
    if (!created) return null;
    const ageInDays = Math.round((parseDateOnly(getClinicToday()) - created) / MS_PER_DAY);
    return DEBT_AGE_LEVELS.find((level) => ageInDays > level.days) ?? null;
};
