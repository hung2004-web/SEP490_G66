import { formatDate, toDateOnly } from "../utils/format";
import { MOCK_PENDING_REQUESTS, MOCK_REVENUE_SHARES, MOCK_TODAY_APPOINTMENTS } from "../utils/data/mockAdminReport";

// TODO(api): mock only. The numbers are made up from the date, so the same day always gives the same figures.
const MOCK_DELAY_MS = 300;

export const REPORT_PERIODS = {
    DAY: "day",
    WEEK: "week",
    MONTH: "month",
    YEAR: "year",
};

const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
// Opening hours split into 2-hour slots for the "day" chart, with each slot's share of the day.
const DAY_SLOTS = [
    { label: "08h", weight: 0.14 },
    { label: "10h", weight: 0.22 },
    { label: "12h", weight: 0.1 },
    { label: "14h", weight: 0.2 },
    { label: "16h", weight: 0.2 },
    { label: "18h", weight: 0.14 },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data) => ({ success: true, message: null, data, errors: null });

const pad = (value) => String(value).padStart(2, "0");

const round1 = (value) => Math.round(value * 10) / 10;

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Monday of the week.
const startOfWeek = (date) => addDays(date, -((date.getDay() + 6) % 7));

const daysBetween = (from, to) => {
    const days = [];
    for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
    return days;
};

// Number in [0, 1) that only depends on the text, so mock figures stay the same between reloads.
const seeded = (text) => {
    let hash = 2166136261;
    for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return ((hash >>> 0) % 1000) / 1000;
};

// Revenue (million VND), visits and new patients of one day.
const dailyStats = (date) => {
    const key = toDateOnly(date);
    const saturday = date.getDay() === 6;
    return {
        revenue: round1(14 + seeded(`${key}-revenue`) * 18 + (saturday ? 6 : 0)),
        visits: 12 + Math.floor(seeded(`${key}-visits`) * 12),
        newPatients: Math.floor(seeded(`${key}-patients`) * 4),
    };
};

const getRange = (period, offset, today) => {
    if (period === REPORT_PERIODS.DAY) {
        const day = addDays(today, offset);
        return { from: day, to: day };
    }
    if (period === REPORT_PERIODS.WEEK) {
        const from = addDays(startOfWeek(today), offset * 7);
        return { from, to: addDays(from, 6) };
    }
    if (period === REPORT_PERIODS.MONTH) {
        const from = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        return { from, to: new Date(from.getFullYear(), from.getMonth() + 1, 0) };
    }
    const year = today.getFullYear() + offset;
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
};

const rangeLabel = (period, { from, to }) => {
    if (period === REPORT_PERIODS.DAY) return formatDate(toDateOnly(from));
    if (period === REPORT_PERIODS.MONTH) return `Tháng ${from.getMonth() + 1}/${from.getFullYear()}`;
    if (period === REPORT_PERIODS.YEAR) return `Năm ${from.getFullYear()}`;
    const start = from.getFullYear() === to.getFullYear() ? `${pad(from.getDate())}/${pad(from.getMonth() + 1)}` : formatDate(toDateOnly(from));
    return `${start} – ${formatDate(toDateOnly(to))}`;
};

const sumRevenue = (days) => round1(days.reduce((sum, day) => sum + dailyStats(day).revenue, 0));

// Chart bars; days after today have no data yet (value null).
const buildBars = (period, { from, to }, today) => {
    const elapsed = (day) => day <= today;
    const sumElapsed = (days) => (days.some(elapsed) ? sumRevenue(days.filter(elapsed)) : null);

    if (period === REPORT_PERIODS.DAY) {
        const revenue = elapsed(from) ? dailyStats(from).revenue : null;
        return DAY_SLOTS.map((slot) => ({ label: slot.label, value: revenue === null ? null : round1(revenue * slot.weight) }));
    }
    if (period === REPORT_PERIODS.WEEK) {
        return daysBetween(from, to).map((day) => ({
            label: WEEKDAYS_SHORT[day.getDay()],
            sublabel: `${pad(day.getDate())}/${pad(day.getMonth() + 1)}`,
            value: elapsed(day) ? dailyStats(day).revenue : null,
        }));
    }
    if (period === REPORT_PERIODS.MONTH) {
        const days = daysBetween(from, to);
        return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => {
            const week = days.slice(index * 7, index * 7 + 7);
            return {
                label: `Tuần ${index + 1}`,
                sublabel: `${pad(week[0].getDate())}–${pad(week.at(-1).getDate())}`,
                value: sumElapsed(week),
            };
        });
    }
    return Array.from({ length: 12 }, (_, month) => ({
        label: `T${month + 1}`,
        value: sumElapsed(daysBetween(new Date(from.getFullYear(), month, 1), new Date(from.getFullYear(), month + 1, 0))),
    }));
};

const percentChange = (current, previous) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);

// Report of one period. offset: 0 = the current period, -1 = the one before, ...
// Changes compare with the same number of days at the start of the previous period, so a week in progress is fair.
export const getReport = async ({ period = REPORT_PERIODS.WEEK, offset = 0 } = {}) => {
    await wait(MOCK_DELAY_MS);

    const now = new Date();
    const today = startOfDay(now);
    const range = getRange(period, offset, today);
    const days = daysBetween(range.from, range.to < today ? range.to : today);
    const previousRange = getRange(period, offset - 1, today);
    const previousDays = daysBetween(previousRange.from, previousRange.to).slice(0, days.length);

    const total = (list, field) => list.reduce((sum, day) => sum + dailyStats(day)[field], 0);
    const revenue = sumRevenue(days);
    const visits = total(days, "visits");
    const newPatients = total(days, "newPatients");

    return success({
        period,
        from: toDateOnly(range.from),
        to: toDateOnly(range.to),
        label: rangeLabel(period, range),
        updatedAt: now.toISOString(),
        revenue: { value: revenue, change: percentChange(revenue, sumRevenue(previousDays)) },
        visits: { value: visits, change: percentChange(visits, total(previousDays, "visits")) },
        newPatients: { value: newPatients, change: newPatients - total(previousDays, "newPatients") },
        todayAppointments: { ...MOCK_TODAY_APPOINTMENTS },
        revenueBars: buildBars(period, range, today),
        revenueByService: MOCK_REVENUE_SHARES.map(({ label, share }) => ({ label, value: round1(revenue * share) })),
    });
};

export const getPendingRequests = async () => {
    await wait(MOCK_DELAY_MS);
    return success(MOCK_PENDING_REQUESTS.map((request) => ({ ...request })));
};
