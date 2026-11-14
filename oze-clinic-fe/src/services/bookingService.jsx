import { getMockCurrentUser, getMockUsers } from "../utils/data/mockData";
import {
    MOCK_GONE_VARIANT_ID,
    getMockBlockingAppointment,
    getMockBookedAppointment,
    getMockBookingDay,
    getMockBookingDoctors,
    getMockBookingServices,
    getMockFreeStarts,
    markMockSlotTaken,
    pickMockDoctor,
    saveMockBookedAppointment,
    toMockSlotEnd,
} from "../utils/data/mockBooking";
import { addDays, getClinicToday, parseDateOnly, toDateOnly } from "../utils/format";
import { APPOINTMENT_STATUS, BOOKING_ERROR_CODE, BOOKING_MAX_DAYS_AHEAD, GENERIC_ERROR_MESSAGE, USER_ROLES } from "../utils/messages";

const MOCK_DELAY_MS = 300;
const MOCK_SWITCH_KEY = "mock_booking";
const BOOKED_CODE = "LH000270";

const usedModes = new Set();
const goneVariantIds = new Set();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const abortError = () => new DOMException("Aborted", "AbortError");

const success = (data) => ({ success: true, message: null, data, code: null });

const failure = (code, data = null) => ({ success: false, message: GENERIC_ERROR_MESSAGE, data, code });

const readMockMode = () => (import.meta.env.DEV ? localStorage.getItem(MOCK_SWITCH_KEY) : null);

const settle = async (signal) => {
    await wait(MOCK_DELAY_MS);
    if (signal?.aborted) throw abortError();
    return readMockMode();
};

const takeOnce = (mode, name) => {
    if (mode !== name || usedModes.has(name)) return false;
    usedModes.add(name);
    return true;
};

const shiftDate = (date, days) => toDateOnly(addDays(parseDateOnly(date), days));

const currentPatient = () => {
    const user = getMockCurrentUser() ?? getMockUsers().find((item) => item.role === USER_ROLES.PATIENT);
    return user
        ? { fullName: user.fullname, gender: user.gender, birthdate: user.birthdate, phone: user.phone, email: user.email }
        : null;
};

export const getBookingContext = async ({ signal } = {}) => {
    const mode = await settle(signal);
    if (mode === "error") return failure(BOOKING_ERROR_CODE.GENERIC);
    const patient = currentPatient();
    if (mode === "unlinked" || !patient) return failure(BOOKING_ERROR_CODE.PROFILE_NOT_FOUND);
    const today = getClinicToday();
    return success({
        patient,
        services: getMockBookingServices(goneVariantIds),
        doctors: getMockBookingDoctors(),
        unfinished: mode === "blocked" ? getMockBlockingAppointment(today) : getMockBookedAppointment(),
    });
};

export const getBookingDays = async ({ from, to, doctorId, signal } = {}) => {
    const mode = await settle(signal);
    const now = new Date();
    const today = getClinicToday();
    const days = [];
    for (let date = from; date <= to; date = shiftDate(date, 1)) {
        const day = getMockBookingDay(date, doctorId, now, today);
        days.push(mode === "no-slots" ? { ...day, freeSlotCount: 0, firstSlotStart: null } : day);
    }
    return success(days);
};

export const getBookingSlots = async ({ date, doctorId, signal } = {}) => {
    const mode = await settle(signal);
    if (takeOnce(mode, "slots-error")) return failure(BOOKING_ERROR_CODE.GENERIC);
    if (mode === "no-slots") return success([]);
    const starts = getMockFreeStarts(date, doctorId, new Date(), getClinicToday());
    return success(starts.map((start) => ({ slotStart: start, slotEnd: toMockSlotEnd(start) })));
};

const describeServices = (payload) => {
    const services = getMockBookingServices(new Set());
    const byId = new Map(services.map((service) => [service.id, service]));
    const mandatory = services.filter((service) => service.isMandatory).map((service) => service.name);
    const withoutVariant = payload.ServiceId.map((id) => byId.get(id))
        .filter(Boolean)
        .map((service) => service.name);
    const withVariant = payload.VariantId.map((variantId) => {
        const service = services.find((item) => item.variants.some((variant) => variant.id === variantId));
        const variant = service?.variants.find((item) => item.id === variantId);
        return service ? `${service.name} · ${variant.name}` : null;
    }).filter(Boolean);
    return [...mandatory, ...withoutVariant, ...withVariant];
};

export const createBooking = async (payload) => {
    const mode = await settle();
    const now = new Date();
    const today = getClinicToday();
    if (takeOnce(mode, "slot-taken")) {
        markMockSlotTaken(payload.Date, payload.SlotStart);
        return failure(BOOKING_ERROR_CODE.SLOT_NOT_AVAILABLE);
    }
    if (takeOnce(mode, "past-date")) return failure(BOOKING_ERROR_CODE.PAST_DATE);
    if (mode === "service-gone" && !usedModes.has(mode) && payload.VariantId.includes(MOCK_GONE_VARIANT_ID)) {
        usedModes.add(mode);
        goneVariantIds.add(MOCK_GONE_VARIANT_ID);
        return failure(BOOKING_ERROR_CODE.VARIANT_INACTIVE, { variantIds: [MOCK_GONE_VARIANT_ID] });
    }
    if (takeOnce(mode, "submit-error")) return failure(BOOKING_ERROR_CODE.GENERIC);
    if (mode === "blocked" || getMockBookedAppointment()) return failure(BOOKING_ERROR_CODE.HAS_UNFINISHED);
    if (payload.Date < today) return failure(BOOKING_ERROR_CODE.PAST_DATE);
    if (payload.Date > shiftDate(today, BOOKING_MAX_DAYS_AHEAD)) return failure(BOOKING_ERROR_CODE.TOO_FAR_AHEAD);
    const doctor = pickMockDoctor(payload.Date, payload.SlotStart, payload.DoctorId, now, today);
    if (!doctor) return failure(BOOKING_ERROR_CODE.SLOT_NOT_AVAILABLE);
    markMockSlotTaken(payload.Date, payload.SlotStart);
    const appointment = {
        id: null,
        code: BOOKED_CODE,
        date: payload.Date,
        slotStart: payload.SlotStart,
        slotEnd: toMockSlotEnd(payload.SlotStart),
        doctorName: doctor.doctorName,
        services: describeServices(payload),
        note: payload.Note,
        status: APPOINTMENT_STATUS.PENDING,
    };
    saveMockBookedAppointment(appointment);
    return success(appointment);
};
