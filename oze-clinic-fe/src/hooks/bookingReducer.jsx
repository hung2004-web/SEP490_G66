import {
    BOOKING_IDS,
    addItem,
    dayStatus,
    dayText,
    getEarliest,
    isWeekInBounds,
    itemLabel,
    monthOf,
    pickWeekDay,
    reconcileServices,
    removeGoneVariants,
    shiftMonth,
    slotId,
    slotRange,
    toDayMap,
    weekBounds,
    weekRowId,
    weekStartOf,
} from "@/utils/booking";
import { formatClock, formatDayMonth } from "@/utils/format";
import { BOOKING_ERROR_CODE, BOOKING_TEXT } from "@/utils/messages";

const CAUSE_RANK = { refresh: 1, retry: 1, doctor: 2, "submit-slot": 3, "submit-date": 3 };

const CLEARED_MESSAGES = { dayInfo: null, slotWarning: null, slotWarningLive: false, slotError: null, submitError: null };

export const rangeKeyOf = (state) => `${state.today}|${state.doctorId ?? ""}|${state.version}`;

export const slotsKeyOf = (state) => (state.day ? `${state.day}|${state.doctorId ?? ""}|${state.version}` : null);

const sameScope = (rangeKey, slotsKey) => rangeKey.split("|").slice(1).join("|") === slotsKey.split("|").slice(1).join("|");

export const createInitialState = (today) => ({
    page: { status: "loading", profileLoaded: false },
    context: null,
    contextVersion: 0,
    blockedByServer: false,
    blockedLoading: false,
    items: [],
    pickService: null,
    pickVariant: null,
    serviceError: null,
    goneMessages: [],
    today,
    doctorId: null,
    weekStart: weekStartOf(today),
    day: null,
    slot: null,
    autoPick: "earliest",
    formShown: false,
    calendar: { open: false, month: monthOf(weekStartOf(today)) },
    version: 0,
    range: { key: null, days: null, error: false },
    slots: { key: null, data: null, error: false },
    cause: null,
    ...CLEARED_MESSAGES,
    live: { text: "", seq: 0 },
    submitting: false,
    done: null,
    note: "",
    updatedAt: null,
    focusRequest: null,
    focusSeq: 0,
});

const requestFocus = (state, targets, waitFor = null, interim = null) => ({
    ...state,
    focusSeq: state.focusSeq + 1,
    focusRequest: { targets, waitFor, interim, seq: state.focusSeq + 1 },
});

const announce = (state, text) => ({ ...state, live: { text, seq: state.live.seq + 1 } });

export const mergeCause = (current, next) => {
    if (!current) return next;
    const kind = CAUSE_RANK[next.kind] >= CAUSE_RANK[current.kind] ? next.kind : current.kind;
    return { kind, prevDay: current.prevDay, prevSlot: current.prevSlot };
};

const relocate = (state) => {
    const { today, range, cause } = state;
    const earliest = getEarliest(today, range.days);
    if (!earliest) {
        const next = { ...state, day: null, slot: null, autoPick: "earliest", cause: null, formShown: true };
        return cause?.kind === "doctor" ? next : requestFocus(next, [BOOKING_IDS.STATE_TITLE]);
    }
    let next = { ...state, formShown: true };
    if (!next.day) {
        const day = next.autoPick === "earliest" ? earliest.date : pickWeekDay(next.weekStart, today, range.days);
        next = { ...next, day, slot: null, weekStart: day ? weekStartOf(day) : next.weekStart, autoPick: "week" };
    } else if (dayStatus(next.day, today, range.days).kind !== "free") {
        const target = pickWeekDay(next.weekStart, today, range.days) ?? earliest.date;
        const gone = formatDayMonth(next.day);
        const moved = dayText(target);
        const base = { ...next, day: target, weekStart: weekStartOf(target), slot: null };
        if (cause?.kind === "doctor") {
            next = { ...base, dayInfo: BOOKING_TEXT.DAY_GONE_DOCTOR(gone, moved) + (state.slot ? BOOKING_TEXT.DAY_GONE_DOCTOR_SLOT : "") };
        } else if (cause?.kind.startsWith("submit")) {
            next = { ...base, dayInfo: BOOKING_TEXT.DAY_GONE(gone, moved) };
        } else {
            next = state.slot ? { ...base, dayInfo: BOOKING_TEXT.DAY_GONE(gone, moved), slotWarning: BOOKING_TEXT.SLOT_GONE(slotRange(state.slot)), slotWarningLive: true } : { ...base, dayInfo: BOOKING_TEXT.DAY_GONE(gone, moved) };
        }
    }
    if (!isWeekInBounds(next.weekStart, weekBounds(today))) {
        next = { ...next, weekStart: weekStartOf(earliest.date), day: earliest.date, slot: null };
    }
    const slotsDone = next.day === state.day && state.slots.key === slotsKeyOf(next);
    return slotsDone || next.day !== state.day ? { ...next, cause: null } : next;
};

const applyRange = (state, requestedAt) => {
    const cause = state.cause;
    const next = relocate({ ...state, updatedAt: requestedAt });
    if (cause?.kind !== "refresh") return next;
    const count = next.day ? (next.range.days[next.day]?.freeSlotCount ?? 0) : 0;
    return announce(next, BOOKING_TEXT.REFRESHED(formatClock(requestedAt), count));
};

const mergeSlotsIntoDays = (days, date, slots) => ({
    ...days,
    [date]: { ...days[date], date, freeSlotCount: slots.length, firstSlotStart: slots[0]?.slotStart ?? null },
});

const applySlots = (state) => {
    const data = state.slots.data;
    const rangeKey = rangeKeyOf(state);
    const rangeReady = state.range.key === rangeKey && !state.range.error && state.range.days;
    const next = rangeReady ? { ...state, range: { ...state.range, days: mergeSlotsIntoDays(state.range.days, state.day, data) } } : state;
    if (!data.length) return rangeReady ? relocate(next) : next;
    const done = rangeReady ? { ...next, cause: null } : next;
    if (!next.slot || data.some((slot) => slot.slotStart === next.slot)) return done;
    if (next.cause?.kind.startsWith("submit")) return { ...done, slot: null };
    return { ...done, slot: null, slotWarning: BOOKING_TEXT.SLOT_GONE(slotRange(next.slot)), slotWarningLive: true };
};

const loadContext = (state, result) => {
    if (!result.success) {
        const unlinked = result.code === BOOKING_ERROR_CODE.PROFILE_NOT_FOUND;
        return requestFocus({ ...state, page: { status: unlinked ? "unlinked" : "error", profileLoaded: false } }, [BOOKING_IDS.STATE_TITLE]);
    }
    const { services, doctors, unfinished } = result.data;
    const empty = !services?.length || !doctors?.length;
    const next = { ...state, context: result.data, page: { status: empty ? "error" : "ready", profileLoaded: true } };
    return empty || unfinished ? requestFocus(next, [BOOKING_IDS.STATE_TITLE]) : next;
};

const reload = (state, { kind, today, focus, waitFor = null, interim = null }) => {
    const next = {
        ...state,
        ...CLEARED_MESSAGES,
        today,
        version: state.version + 1,
        cause: mergeCause(state.cause, { kind, prevDay: state.day, prevSlot: state.slot }),
    };
    return focus ? requestFocus(next, focus, waitFor, interim) : next;
};

const goWeek = (state, { weekStart, focus }) => {
    const closed = { ...state, calendar: { ...state.calendar, open: false } };
    if (weekStart === state.weekStart) return requestFocus(closed, focus);
    const rangeReady = state.range.key === rangeKeyOf(state) && !state.range.error;
    const day = rangeReady ? pickWeekDay(weekStart, state.today, state.range.days) : null;
    const autoPick = state.autoPick === "earliest" && !getEarliest(state.today, state.range.days) ? "earliest" : "week";
    return requestFocus({ ...closed, ...CLEARED_MESSAGES, weekStart, day, slot: null, cause: null, autoPick }, focus);
};

const submitFailed = (state, { result, today, snapshot }) => {
    const matches = state.day === snapshot.day && state.slot === snapshot.slot && state.doctorId === snapshot.doctorId;
    const base = { ...state, submitting: false };
    switch (result.code) {
        case BOOKING_ERROR_CODE.SLOT_NOT_AVAILABLE:
        case BOOKING_ERROR_CODE.PAST_DATE:
        case BOOKING_ERROR_CODE.TOO_FAR_AHEAD: {
            const slotTaken = result.code === BOOKING_ERROR_CODE.SLOT_NOT_AVAILABLE;
            const next = reload(base, { kind: slotTaken ? "submit-slot" : "submit-date", today, focus: [BOOKING_IDS.SLOTS] });
            const slotWarning = slotTaken ? BOOKING_TEXT.SUBMIT_SLOT_TAKEN(slotRange(snapshot.slot)) : BOOKING_TEXT.SUBMIT_PAST_DATE;
            return { ...next, slot: matches ? null : next.slot, slotWarning };
        }
        case BOOKING_ERROR_CODE.VARIANT_INACTIVE: {
            const oldServices = state.context.services;
            const services = removeGoneVariants(oldServices, result.data?.variantIds ?? []);
            const reconciled = reconcileServices(state.items, state, oldServices, services);
            return requestFocus(
                {
                    ...base,
                    context: { ...state.context, services },
                    items: reconciled.items,
                    pickService: reconciled.pickService,
                    pickVariant: reconciled.pickVariant,
                    goneMessages: reconciled.goneLabels.map(BOOKING_TEXT.SERVICE_GONE),
                },
                [BOOKING_IDS.SERVICE]
            );
        }
        case BOOKING_ERROR_CODE.HAS_UNFINISHED:
            return requestFocus({ ...base, blockedByServer: true, blockedLoading: true }, [BOOKING_IDS.STATE_TITLE]);
        case BOOKING_ERROR_CODE.PROFILE_NOT_FOUND:
            return requestFocus({ ...base, page: { status: "unlinked", profileLoaded: false } }, [BOOKING_IDS.STATE_TITLE]);
        default:
            return requestFocus({ ...base, submitError: BOOKING_TEXT.SUBMIT_ERROR }, [BOOKING_IDS.SUBMIT]);
    }
};

const addService = (state) => {
    const services = state.context.services;
    const { items, item, keepService } = addItem(state.items, services, state.pickService, state.pickVariant);
    const next = {
        ...state,
        items,
        pickService: keepService ? state.pickService : null,
        pickVariant: null,
        serviceError: null,
        goneMessages: [],
        submitError: null,
    };
    return requestFocus(announce(next, BOOKING_TEXT.SERVICE_ADDED(itemLabel(services, item), items.length)), [keepService ? BOOKING_IDS.VARIANT : BOOKING_IDS.SERVICE]);
};

const removeService = (state, item) => {
    const label = itemLabel(state.context.services, item);
    const items = state.items.filter((entry) => !(entry.serviceId === item.serviceId && entry.variantId === item.variantId));
    return requestFocus(announce({ ...state, items, goneMessages: [], submitError: null }, BOOKING_TEXT.SERVICE_REMOVED(label)), [BOOKING_IDS.SERVICE]);
};

export const bookingReducer = (state, action) => {
    switch (action.type) {
        case "CONTEXT_LOADED":
            return loadContext(state, action.result);
        case "RETRY_CONTEXT":
            return {
                ...state,
                page: { status: "loading", profileLoaded: false },
                contextVersion: state.contextVersion + 1,
                today: action.today,
                version: state.version + 1,
                formShown: false,
                autoPick: "earliest",
                day: null,
                slot: null,
                cause: null,
                focusSeq: state.focusSeq + 1,
                focusRequest: { targets: [BOOKING_IDS.SERVICE, BOOKING_IDS.STATE_TITLE], waitFor: "ready", interim: BOOKING_IDS.PAGE_TITLE, seq: state.focusSeq + 1 },
            };
        case "RANGE_LOADED": {
            if (action.key !== rangeKeyOf(state)) return state;
            if (!action.result.success) {
                const failed = { ...state, range: { ...state.range, key: action.key, error: true }, cause: null };
                return failed.formShown ? failed : requestFocus(failed, [BOOKING_IDS.STATE_TITLE]);
            }
            let days = toDayMap(action.result.data);
            const slotsKey = slotsKeyOf(state);
            if (slotsKey && state.slots.key === slotsKey && !state.slots.error && sameScope(action.key, slotsKey)) {
                days = mergeSlotsIntoDays(days, state.day, state.slots.data);
            }
            return applyRange({ ...state, range: { key: action.key, days, error: false } }, action.requestedAt);
        }
        case "SLOTS_LOADED": {
            if (action.key !== slotsKeyOf(state)) return state;
            if (!action.result.success) {
                const rangeDone = state.range.key === rangeKeyOf(state);
                return { ...state, slots: { key: action.key, data: null, error: true }, cause: rangeDone ? null : state.cause };
            }
            return applySlots({ ...state, slots: { key: action.key, data: action.result.data, error: false } });
        }
        case "PICK_SERVICE":
            return { ...state, pickService: action.serviceId, pickVariant: null, submitError: null };
        case "PICK_VARIANT":
            return { ...state, pickVariant: action.variant, submitError: null };
        case "ADD_SERVICE":
            return addService(state);
        case "REMOVE_SERVICE":
            return removeService(state, action.item);
        case "NOTE":
            return { ...state, note: action.value, submitError: null };
        case "DOCTOR":
            return {
                ...state,
                ...CLEARED_MESSAGES,
                doctorId: action.doctorId,
                today: action.today,
                calendar: { ...state.calendar, open: false },
                cause: mergeCause(state.cause, { kind: "doctor", prevDay: state.day, prevSlot: state.slot }),
            };
        case "ALL_DOCTORS":
            return requestFocus(
                { ...state, ...CLEARED_MESSAGES, doctorId: null, today: action.today, day: null, slot: null, autoPick: "earliest", cause: mergeCause(state.cause, { kind: "doctor", prevDay: null, prevSlot: null }) },
                [BOOKING_IDS.DOCTOR]
            );
        case "TOGGLE_CALENDAR": {
            const open = !state.calendar.open;
            return requestFocus(
                { ...state, calendar: { open, month: monthOf(state.weekStart) } },
                open ? [weekRowId(state.weekStart), BOOKING_IDS.WEEK_BUTTON] : [BOOKING_IDS.WEEK_BUTTON]
            );
        }
        case "CALENDAR_MONTH":
            return requestFocus({ ...state, calendar: { ...state.calendar, month: shiftMonth(state.calendar.month, action.step) } }, action.focus);
        case "CLOSE_CALENDAR": {
            const closed = { ...state, calendar: { ...state.calendar, open: false } };
            return action.returnFocus ? requestFocus(closed, [BOOKING_IDS.WEEK_BUTTON]) : closed;
        }
        case "GO_WEEK":
            return goWeek(state, action);
        case "SELECT_DAY":
            return { ...state, ...CLEARED_MESSAGES, day: action.date, slot: null, cause: null };
        case "SELECT_SLOT":
            return { ...state, ...CLEARED_MESSAGES, slot: action.slot, cause: null };
        case "PICK_EARLIEST": {
            const earliest = getEarliest(state.today, state.range.days);
            if (!earliest) return state;
            const next = { ...state, ...CLEARED_MESSAGES, weekStart: weekStartOf(earliest.date), day: earliest.date, slot: earliest.slotStart, cause: null };
            return requestFocus(next, [slotId(earliest.slotStart), BOOKING_IDS.SLOTS], "slots", BOOKING_IDS.SLOTS);
        }
        case "RELOAD":
            return reload(state, action);
        case "VALIDATE":
            return requestFocus({ ...state, serviceError: action.serviceError, slotError: action.slotError, submitError: null, slotWarning: null, goneMessages: [] }, action.focus);
        case "SUBMIT_START":
            return { ...state, submitting: true, submitError: null, slotWarning: null, goneMessages: [], serviceError: null, slotError: null };
        case "SUBMIT_DONE":
            if (action.result.success) return requestFocus({ ...state, submitting: false, done: action.result.data }, [BOOKING_IDS.STATE_TITLE]);
            return submitFailed(state, action);
        case "BLOCKED_LOADED":
            return { ...state, blockedLoading: false, context: action.unfinished ? { ...state.context, unfinished: action.unfinished } : state.context };
        case "SERVICES_RELOADED": {
            const known = new Set(action.services.flatMap((service) => service.variants.map((variant) => variant.id)));
            const consistent = state.items.every((item) => item.variantId === null || known.has(item.variantId));
            return consistent ? { ...state, context: { ...state.context, services: action.services } } : state;
        }
        default:
            return state;
    }
};
