import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { createBooking, getBookingContext, getBookingDays, getBookingSlots } from "@/services/bookingService";
import { BOOKING_IDS, addDaysToDate, buildBookingPayload, dayId, getEarliest, getPendingSelection, getRange, slotId, weekBounds } from "@/utils/booking";
import { getClinicToday } from "@/utils/format";
import { BOOKING_ERROR_CODE, BOOKING_TEXT } from "@/utils/messages";
import { bookingReducer, createInitialState, rangeKeyOf, slotsKeyOf } from "./bookingReducer";

const ABORT = "AbortError";

const failedResult = { success: false, code: null, data: null };

const isUsable = (element) => element && !element.disabled && element.getAttribute("aria-disabled") !== "true";

const useBookingForm = () => {
    const [state, dispatch] = useReducer(bookingReducer, null, () => createInitialState(getClinicToday()));
    const handledFocus = useRef(0);
    const interimFocus = useRef({ seq: 0, element: null });
    const sending = useRef(false);

    const rangeKey = rangeKeyOf(state);
    const slotsKey = slotsKeyOf(state);
    const unfinished = state.context?.unfinished ?? null;
    const blocked = state.blockedByServer || Boolean(unfinished);
    const loadEnabled = state.page.status === "ready" && !blocked && !state.done;
    const rangeBusy = loadEnabled && state.range.key !== rangeKey;
    const slotsBusy = loadEnabled && Boolean(slotsKey) && state.slots.key !== slotsKey;
    const busy = rangeBusy || slotsBusy;
    const today = state.today;

    useEffect(() => {
        const controller = new AbortController();
        getBookingContext({ signal: controller.signal }).then(
            (result) => dispatch({ type: "CONTEXT_LOADED", result }),
            (error) => error?.name !== ABORT && dispatch({ type: "CONTEXT_LOADED", result: failedResult })
        );
        return () => controller.abort();
    }, [state.contextVersion]);

    useEffect(() => {
        if (!loadEnabled) return undefined;
        const controller = new AbortController();
        const requestedAt = Date.now();
        const { from, to } = getRange(today);
        getBookingDays({ from, to, doctorId: state.doctorId, signal: controller.signal }).then(
            (result) => dispatch({ type: "RANGE_LOADED", key: rangeKey, result, requestedAt }),
            (error) => error?.name !== ABORT && dispatch({ type: "RANGE_LOADED", key: rangeKey, result: failedResult, requestedAt })
        );
        return () => controller.abort();
    }, [loadEnabled, rangeKey, today, state.doctorId]);

    useEffect(() => {
        if (!loadEnabled || !slotsKey) return undefined;
        const controller = new AbortController();
        getBookingSlots({ date: state.day, doctorId: state.doctorId, signal: controller.signal }).then(
            (result) => dispatch({ type: "SLOTS_LOADED", key: slotsKey, result }),
            (error) => error?.name !== ABORT && dispatch({ type: "SLOTS_LOADED", key: slotsKey, result: failedResult })
        );
        return () => controller.abort();
    }, [loadEnabled, slotsKey, state.day, state.doctorId]);

    useLayoutEffect(() => {
        const request = state.focusRequest;
        if (!request || handledFocus.current === request.seq) return;
        const waiting =
            (request.waitFor === "slots" && slotsBusy) ||
            (request.waitFor === "range" && rangeBusy) ||
            (request.waitFor === "ready" && (state.page.status === "loading" || rangeBusy));
        if (waiting) {
            if (request.interim && interimFocus.current.seq !== request.seq) {
                const element = document.getElementById(request.interim);
                if (isUsable(element)) element.focus();
                interimFocus.current = { seq: request.seq, element: isUsable(element) ? element : null };
            }
            return;
        }
        handledFocus.current = request.seq;
        const held = interimFocus.current.seq === request.seq ? interimFocus.current.element : null;
        const moved = held && document.activeElement !== held && document.activeElement !== document.body;
        if (moved) return;
        const target = request.targets.map((id) => document.getElementById(id)).find(isUsable);
        target?.focus();
    });

    const services = state.context?.services ?? [];
    const earliest = getEarliest(today, state.range.days);

    const submit = async () => {
        if (sending.current || state.submitting || (state.day && busy)) return;
        const pending = getPendingSelection(services, state.items, state.pickService, state.pickVariant);
        const serviceError = pending ? BOOKING_TEXT.SERVICE_PENDING(pending) : state.items.length ? null : BOOKING_TEXT.SERVICE_REQUIRED;
        const slotError = state.slot ? null : BOOKING_TEXT.SLOT_REQUIRED;
        if (serviceError || slotError) {
            const firstSlot = state.slots.key === slotsKey ? state.slots.data?.[0] : null;
            let focus = [BOOKING_IDS.SERVICE];
            if (pending) focus = [BOOKING_IDS.ADD_SERVICE, BOOKING_IDS.VARIANT, BOOKING_IDS.SERVICE];
            else if (!serviceError) focus = [firstSlot ? slotId(firstSlot.slotStart) : BOOKING_IDS.SUBMIT, BOOKING_IDS.SUBMIT];
            dispatch({ type: "VALIDATE", serviceError, slotError, focus });
            return;
        }
        const snapshot = { day: state.day, slot: state.slot, doctorId: state.doctorId };
        sending.current = true;
        dispatch({ type: "SUBMIT_START" });
        const payload = buildBookingPayload({ items: state.items, services, date: state.day, slotStart: state.slot, doctorId: state.doctorId, note: state.note });
        const result = await createBooking(payload).catch(() => failedResult);
        sending.current = false;
        dispatch({ type: "SUBMIT_DONE", result, today: getClinicToday(), snapshot });
        if (result.success) {
            window.scrollTo(0, 0);
            return;
        }
        const servicesGone = result.code === BOOKING_ERROR_CODE.VARIANT_INACTIVE;
        if (!servicesGone && result.code !== BOOKING_ERROR_CODE.HAS_UNFINISHED) return;
        const context = await getBookingContext().catch(() => failedResult);
        if (servicesGone) {
            if (context.success) dispatch({ type: "SERVICES_RELOADED", services: context.data.services });
            return;
        }
        dispatch({ type: "BLOCKED_LOADED", unfinished: context.success ? context.data.unfinished : null });
    };

    const goWeek = (weekStart, focus) => dispatch({ type: "GO_WEEK", weekStart, focus });
    const bounds = weekBounds(today);

    const actions = {
        retryContext: () => dispatch({ type: "RETRY_CONTEXT", today: getClinicToday() }),
        pickService: (serviceId) => dispatch({ type: "PICK_SERVICE", serviceId }),
        pickVariant: (variant) => dispatch({ type: "PICK_VARIANT", variant }),
        addService: () => dispatch({ type: "ADD_SERVICE" }),
        removeService: (item) => dispatch({ type: "REMOVE_SERVICE", item }),
        changeNote: (value) => dispatch({ type: "NOTE", value }),
        changeDoctor: (doctorId) => dispatch({ type: "DOCTOR", doctorId, today: getClinicToday() }),
        allDoctors: () => dispatch({ type: "ALL_DOCTORS", today: getClinicToday() }),
        toggleCalendar: () => dispatch({ type: "TOGGLE_CALENDAR" }),
        changeMonth: (step) =>
            dispatch({
                type: "CALENDAR_MONTH",
                step,
                focus: step < 0 ? [BOOKING_IDS.MONTH_UP, BOOKING_IDS.MONTH_DOWN] : [BOOKING_IDS.MONTH_DOWN, BOOKING_IDS.MONTH_UP],
            }),
        closeCalendar: (returnFocus) => dispatch({ type: "CLOSE_CALENDAR", returnFocus }),
        pickWeek: (weekStart) => goWeek(weekStart, [BOOKING_IDS.WEEK_BUTTON]),
        prevWeek: () => goWeek(addDaysToDate(state.weekStart, -7), [BOOKING_IDS.PREV_WEEK, BOOKING_IDS.THIS_WEEK]),
        thisWeek: () => goWeek(bounds.first, [BOOKING_IDS.THIS_WEEK]),
        nextWeek: () => goWeek(addDaysToDate(state.weekStart, 7), [BOOKING_IDS.NEXT_WEEK, BOOKING_IDS.PREV_WEEK]),
        selectDay: (date) => dispatch({ type: "SELECT_DAY", date }),
        selectSlot: (slot) => dispatch({ type: "SELECT_SLOT", slot }),
        pickEarliest: () => !rangeBusy && dispatch({ type: "PICK_EARLIEST" }),
        refresh: () => dispatch({ type: "RELOAD", kind: "refresh", today: getClinicToday(), focus: null }),
        retryDays: () => dispatch({ type: "RELOAD", kind: "retry", today: getClinicToday(), focus: [dayId(state.day), BOOKING_IDS.WEEK_BUTTON, BOOKING_IDS.STATE_TITLE], waitFor: "ready", interim: BOOKING_IDS.PAGE_TITLE }),
        retrySlots: () => dispatch({ type: "RELOAD", kind: "retry", today: getClinicToday(), focus: [BOOKING_IDS.SLOTS] }),
        submit,
    };

    return { state, actions, services, earliest, unfinished, blocked, bounds, rangeBusy, slotsBusy, busy, slotsKey };
};

export default useBookingForm;
