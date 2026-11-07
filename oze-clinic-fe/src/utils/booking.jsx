import { addDays, formatDate, formatDayMonth, formatPhone, formatTimeRange, getIsoWeek, getWeekStart, parseDateOnly, toDateOnly } from "./format";
import { BOOKING_MAX_DAYS_AHEAD, BOOKING_TEXT } from "./messages";

export const DAYS_PER_WEEK = 7;
export const NOON = "12:00:00";
export const UNKNOWN_VARIANT = "unknown";

export const BOOKING_IDS = {
    NOTE: "booking-note",
    SERVICE: "booking-service",
    VARIANT: "booking-variant",
    ADD_SERVICE: "booking-add-service",
    DOCTOR: "booking-doctor",
    WEEK_BUTTON: "booking-week-button",
    PREV_WEEK: "booking-prev-week",
    THIS_WEEK: "booking-this-week",
    NEXT_WEEK: "booking-next-week",
    MONTH_UP: "booking-month-up",
    MONTH_DOWN: "booking-month-down",
    DAYS_RETRY: "booking-days-retry",
    PICK_EARLIEST: "booking-pick-earliest",
    REFRESH: "booking-refresh",
    SLOTS: "booking-slots",
    SLOTS_RETRY: "booking-slots-retry",
    SUBMIT: "booking-submit",
    STATE_TITLE: "booking-state-title",
};

export const dayId = (date) => `booking-day-${date}`;

export const slotId = (slotStart) => `booking-slot-${slotStart.slice(0, 5).replace(":", "")}`;

export const weekRowId = (weekStart) => `booking-week-${weekStart}`;

export const addDaysToDate = (date, days) => toDateOnly(addDays(parseDateOnly(date), days));

export const weekStartOf = (date) => getWeekStart(parseDateOnly(date));

export const getRange = (today) => ({ from: today, to: addDaysToDate(today, BOOKING_MAX_DAYS_AHEAD) });

export const weekBounds = (today) => ({ first: weekStartOf(today), last: weekStartOf(getRange(today).to) });

export const isWeekInBounds = (weekStart, bounds) => weekStart >= bounds.first && weekStart <= bounds.last;

export const weekDates = (weekStart) => Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDaysToDate(weekStart, index));

export const dayLabel = (date) => BOOKING_TEXT.WEEKDAYS[parseDateOnly(date).getDay()];

export const dayText = (date, withYear = false) => `${dayLabel(date)}, ${withYear ? formatDate(date) : formatDayMonth(date)}`;

export const weekRangeText = (weekStart, withYear = false) =>
    `${formatDayMonth(weekStart)} – ${withYear ? formatDate(addDaysToDate(weekStart, DAYS_PER_WEEK - 1)) : formatDayMonth(addDaysToDate(weekStart, DAYS_PER_WEEK - 1))}`;

export const weekText = (weekStart) => BOOKING_TEXT.WEEK_TEXT(formatDayMonth(weekStart), formatDayMonth(addDaysToDate(weekStart, DAYS_PER_WEEK - 1)));

export const weekAriaText = (weekStart) => {
    const end = addDaysToDate(weekStart, DAYS_PER_WEEK - 1);
    const from = weekStart.slice(0, 4) === end.slice(0, 4) ? formatDayMonth(weekStart) : formatDate(weekStart);
    return `${BOOKING_TEXT.DAY} ${BOOKING_TEXT.WEEK_TEXT(from, formatDayMonth(end))}`;
};

export const slotRange = (slotStart, slotEnd) => (slotStart ? formatTimeRange(slotStart, slotEnd ?? toSlotEnd(slotStart)) : "");

export const toSlotEnd = (slotStart) => {
    const minutes = Number(slotStart.slice(0, 2)) * 60 + Number(slotStart.slice(3, 5)) + 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
};

export const dayStatus = (date, today, days) => {
    if (date < today) return { kind: "past", text: BOOKING_TEXT.DAY_PAST };
    if (date > getRange(today).to) return { kind: "closed", text: BOOKING_TEXT.DAY_CLOSED };
    const day = days?.[date];
    if (!day) return { kind: "unknown", text: "" };
    if (day.freeSlotCount > 0) return { kind: "free", text: BOOKING_TEXT.DAY_FREE(day.freeSlotCount), count: day.freeSlotCount };
    return day.isWorkingDay ? { kind: "full", text: BOOKING_TEXT.DAY_FULL } : { kind: "off", text: BOOKING_TEXT.DAY_OFF };
};

export const toDayMap = (list) => Object.fromEntries(list.map((day) => [day.date, day]));

export const freeDatesIn = (dates, today, days) => dates.filter((date) => dayStatus(date, today, days).kind === "free");

export const pickWeekDay = (weekStart, today, days) => freeDatesIn(weekDates(weekStart), today, days)[0] ?? null;

export const getEarliest = (today, days) => {
    const range = getRange(today);
    const date = Object.keys(days ?? {})
        .filter((key) => key >= range.from && key <= range.to && days[key].freeSlotCount > 0)
        .sort()[0];
    return date ? { date, slotStart: days[date].firstSlotStart } : null;
};

export const calendarWeeks = (month, bounds, today) => {
    const firstDay = new Date(month.year, month.month, 1);
    const lastDay = toDateOnly(new Date(month.year, month.month + 1, 0));
    const weeks = [];
    for (let weekStart = getWeekStart(firstDay); weekStart <= lastDay; weekStart = addDaysToDate(weekStart, DAYS_PER_WEEK)) {
        const dates = weekDates(weekStart);
        weeks.push({
            weekStart,
            week: getIsoWeek(parseDateOnly(weekStart)).week,
            usable: isWeekInBounds(weekStart, bounds),
            hasToday: dates.includes(today),
            days: dates.map((date) => ({ date, day: parseDateOnly(date).getDate(), otherMonth: parseDateOnly(date).getMonth() !== month.month, isToday: date === today })),
        });
    }
    return weeks;
};

export const monthOf = (weekStart) => {
    const thursday = parseDateOnly(addDaysToDate(weekStart, 3));
    return { year: thursday.getFullYear(), month: thursday.getMonth() };
};

export const shiftMonth = (month, step) => {
    const date = new Date(month.year, month.month + step, 1);
    return { year: date.getFullYear(), month: date.getMonth() };
};

export const monthHasUsableWeek = (month, bounds, today) => calendarWeeks(month, bounds, today).some((week) => week.usable);

export const findService = (services, serviceId) => services.find((service) => service.id === serviceId) ?? null;

export const hasItem = (items, serviceId, variantId) => items.some((item) => item.serviceId === serviceId && item.variantId === variantId);

export const itemLabel = (services, item) => {
    const service = findService(services, item.serviceId);
    if (!service) return "";
    if (item.variantId === null) return service.variants.length ? `${service.name} · ${BOOKING_TEXT.VARIANT_UNKNOWN_LABEL}` : service.name;
    const variant = service.variants.find((option) => option.id === item.variantId);
    return variant ? `${service.name} · ${variant.name}` : service.name;
};

export const isServiceFull = (service, items) =>
    service.variants.length ? service.variants.every((variant) => hasItem(items, service.id, variant.id)) : hasItem(items, service.id, null);

export const isUnknownDisabled = (service, items) => items.some((item) => item.serviceId === service.id);

export const canAddSelection = (service, pickVariant, items) =>
    Boolean(service) && (service.variants.length ? pickVariant !== null : !hasItem(items, service.id, null));

const pickToVariantId = (pickVariant) => (pickVariant === UNKNOWN_VARIANT ? null : pickVariant);

export const getPendingSelection = (services, items, pickService, pickVariant) => {
    const service = findService(services, pickService);
    if (!service) return null;
    if (!service.variants.length) return hasItem(items, service.id, null) ? null : service.name;
    if (pickVariant === null) return items.some((item) => item.serviceId === service.id) ? null : service.name;
    return itemLabel(services, { serviceId: service.id, variantId: pickToVariantId(pickVariant) });
};

export const addItem = (items, services, pickService, pickVariant) => {
    const service = findService(services, pickService);
    const item = { serviceId: pickService, variantId: service.variants.length ? pickToVariantId(pickVariant) : null };
    const unknownIndex = items.findIndex((entry) => entry.serviceId === pickService && entry.variantId === null);
    const next = item.variantId !== null && unknownIndex >= 0 ? items.map((entry, index) => (index === unknownIndex ? item : entry)) : [...items, item];
    const hasMore = service.variants.some((variant) => !hasItem(next, service.id, variant.id));
    return { items: next, item, keepService: service.variants.length > 0 && hasMore };
};

export const removeGoneVariants = (services, variantIds) =>
    services.map((service) => ({ ...service, variants: service.variants.filter((variant) => !variantIds.includes(variant.id)) }));

export const reconcileServices = (items, pick, oldServices, newServices) => {
    const goneLabels = [];
    const next = [];
    const replaced = new Set();
    items.forEach((item) => {
        const service = findService(newServices, item.serviceId);
        const variantAlive = item.variantId === null || service?.variants.some((variant) => variant.id === item.variantId);
        if (service && variantAlive) {
            next.push(item);
            return;
        }
        goneLabels.push(itemLabel(oldServices, item));
        if (!service || replaced.has(service.id)) return;
        const stillChosen = items.some((other) => other.serviceId === service.id && other !== item && (other.variantId === null || service.variants.some((variant) => variant.id === other.variantId)));
        if (stillChosen) return;
        replaced.add(service.id);
        next.push({ serviceId: service.id, variantId: null });
    });
    const service = findService(newServices, pick.pickService);
    const variantAlive = pick.pickVariant === null || pick.pickVariant === UNKNOWN_VARIANT || service?.variants.some((variant) => variant.id === pick.pickVariant);
    return {
        items: next,
        goneLabels,
        pickService: service ? pick.pickService : null,
        pickVariant: service && variantAlive ? pick.pickVariant : null,
    };
};

export const buildBookingPayload = ({ items, services, date, slotStart, doctorId, note }) => {
    const mandatoryIds = new Set(services.filter((service) => service.isMandatory).map((service) => service.id));
    const serviceIds = items.filter((item) => item.variantId === null && !mandatoryIds.has(item.serviceId)).map((item) => item.serviceId);
    const trimmed = note.trim();
    return {
        ServiceId: [...new Set(serviceIds)],
        VariantId: items.filter((item) => item.variantId !== null).map((item) => item.variantId),
        Date: date,
        SlotStart: slotStart,
        DoctorId: doctorId,
        Note: trimmed || null,
    };
};

export const formatPatientLine = (patient) =>
    [
        BOOKING_TEXT.GENDER[patient.gender],
        formatDate(patient.birthdate),
        /^\d{10}$/.test(patient.phone ?? "") ? formatPhone(patient.phone) : patient.phone,
        patient.email,
    ]
        .filter(Boolean)
        .join(" · ");

export const avatarLetter = (fullName) => (fullName ?? "").trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "";
