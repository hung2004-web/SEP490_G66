import { getMockCurrentUser } from "../utils/data/mockData";
import { buildEmptyMedicalRecordData, buildMedicalRecordData } from "../utils/data/mockMedicalRecord";
import { buildPatientDebtMock } from "../utils/data/mockPatientDebts";
import { MOCK_DASHBOARD_PATIENT_ID, MOCK_DOCTORS, MOCK_VISIT_SUMMARIES, buildPatientDashboardData } from "../utils/data/mockPatientDashboard";
import { getClinicToday, parseDateOnly, toClinicDateTime, toDateOnly } from "../utils/format";
import { buildDebtItems } from "../utils/patientDebt";
import { APPOINTMENT_CHANGE_DEADLINE_HOURS, APPOINTMENT_STATUS, BOOKING_MAX_DAYS_AHEAD, GENERIC_ERROR_MESSAGE } from "../utils/messages";

const MOCK_DELAY_MS = 300;
const MOCK_SWITCH_KEY = "mock_patient_dashboard";
const HOUR_MS = 60 * 60 * 1000;
const SLOT_MINUTES = 30;
const FIRST_SLOT_MINUTES = 8 * 60;
const LAST_SLOT_MINUTES = 16 * 60 + 30;
const SLOT_LEAD_MS = 2 * HOUR_MS;
const FULL_SLOT_STARTS = ["08:30:00", "14:00:00"];
const BUSY_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN];
const OVERLAP_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED];

const appointmentPatches = new Map();
const takenSlots = new Set();
let slotTakenUsed = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data) => ({ success: true, message: null, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const readMockMode = () => (import.meta.env.DEV ? localStorage.getItem(MOCK_SWITCH_KEY) : null);

const loadMock = async (pick, emptyValue = []) => {
    await wait(MOCK_DELAY_MS);
    const mode = readMockMode();
    if (mode === "error") return failure(GENERIC_ERROR_MESSAGE);
    if (getMockCurrentUser()?.id !== MOCK_DASHBOARD_PATIENT_ID || mode === "empty") return success(emptyValue);
    return success(pick(buildPatientDashboardData(new Date(), mode)));
};

const abortError = () => new DOMException("Aborted", "AbortError");

export const getMyMedicalRecord = async ({ signal } = {}) => {
    await wait(MOCK_DELAY_MS);
    if (signal?.aborted) throw abortError();
    const mode = readMockMode();
    if (mode === "error") return failure(GENERIC_ERROR_MESSAGE);
    if (getMockCurrentUser()?.id !== MOCK_DASHBOARD_PATIENT_ID || mode === "empty") return success(buildEmptyMedicalRecordData());
    return success(buildMedicalRecordData(mode));
};

export const getMyDebts = async ({ signal } = {}) => {
    await wait(MOCK_DELAY_MS);
    if (signal?.aborted) throw abortError();
    const mode = readMockMode();
    if (mode === "error") return failure(GENERIC_ERROR_MESSAGE);
    if (getMockCurrentUser()?.id !== MOCK_DASHBOARD_PATIENT_ID || mode === "empty") return success({ items: [] });
    return success({ items: buildDebtItems(buildMedicalRecordData(mode), buildPatientDebtMock(mode)) });
};

const applyPatch = (appointment) =>
    appointmentPatches.has(appointment.id) ? { ...appointment, ...appointmentPatches.get(appointment.id) } : appointment;

const findAppointment = (appointments, appointmentId) => {
    const row = appointments.find((item) => item.id === appointmentId);
    return row ? applyPatch(row) : null;
};

const buildDetail = (data, appointmentId) => {
    const appointment = findAppointment(data.appointments, Number(appointmentId));
    if (!appointment) return null;
    const examination = Object.hasOwn(MOCK_VISIT_SUMMARIES, appointment.examinationId) ? MOCK_VISIT_SUMMARIES[appointment.examinationId] : null;
    return {
        appointment,
        invoice: data.invoices.find((item) => item.appointmentId === appointment.id) ?? null,
        examination,
        followUp: examination?.followUp ? findAppointment(data.appointments, examination.followUp.appointmentId) : null,
    };
};

export const getChangeDeadline = (appointment) => {
    const slotStart = toClinicDateTime(appointment?.appointmentDate, appointment?.timeSlotStart);
    return slotStart ? new Date(slotStart.getTime() - APPOINTMENT_CHANGE_DEADLINE_HOURS * HOUR_MS) : null;
};

export const isChangeAllowed = (appointment, now = new Date()) => {
    const deadline = getChangeDeadline(appointment);
    return appointment?.status === APPOINTMENT_STATUS.PENDING && deadline !== null && now < deadline;
};

export const getMyAppointments = () => loadMock((data) => data.appointments.map(applyPatch));

export const getMyTreatmentPlans = () => loadMock((data) => data.treatmentPlans);

export const getMyInvoices = () => loadMock((data) => data.invoices);

export const getMyAppointmentDetail = (appointmentId) => loadMock((data) => buildDetail(data, appointmentId), null);

const actionFailure = (code, data = null) => ({ success: false, message: null, data, errors: null, code });

const recordPatch = (appointmentId, patch) => appointmentPatches.set(appointmentId, { ...appointmentPatches.get(appointmentId), ...patch });

const padTime = (value) => String(value).padStart(2, "0");

const toSlotTime = (minutes) => `${padTime(Math.floor(minutes / 60))}:${padTime(minutes % 60)}:00`;

const SLOT_GRID = Array.from({ length: (LAST_SLOT_MINUTES - FIRST_SLOT_MINUTES) / SLOT_MINUTES + 1 }, (_, index) => {
    const start = FIRST_SLOT_MINUTES + index * SLOT_MINUTES;
    return { slotStart: toSlotTime(start), slotEnd: toSlotTime(start + SLOT_MINUTES) };
});

const shiftDateOnly = (value, days) => {
    const date = parseDateOnly(value);
    return date ? toDateOnly(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)) : "";
};

const slotKey = (date, slotStart) => `${date} ${slotStart}`;

const isInSlot = (appointment, date, slotStart) => appointment.appointmentDate === date && appointment.timeSlotStart === slotStart;

const countDoctorAppointments = (appointments, doctorId, date, slotStart, ownId) =>
    appointments.filter((item) => item.id !== ownId && item.doctorId === doctorId && BUSY_STATUSES.includes(item.status) && isInSlot(item, date, slotStart)).length;

export const getRescheduleDates = (appointment, today = getClinicToday()) => {
    const max = shiftDateOnly(today, BOOKING_MAX_DAYS_AHEAD);
    const next = shiftDateOnly(appointment?.appointmentDate, 1);
    const initial = !next || next < today ? today : next > max ? max : next;
    return { min: today, max, initial };
};

const buildSlots = (data, { date, doctorId, appointmentId }, mode, now = new Date()) => {
    const { min, max } = getRescheduleDates(null);
    if (!date || date < min || date > max || mode === "no-slots") return [];
    const appointments = data.appointments.map(applyPatch);
    const own = appointments.find((item) => item.id === Number(appointmentId));
    const doctors = doctorId ? MOCK_DOCTORS.filter((doctor) => doctor.doctorId === Number(doctorId)) : MOCK_DOCTORS;
    return SLOT_GRID.filter((slot) => toClinicDateTime(date, slot.slotStart).getTime() >= now.getTime() + SLOT_LEAD_MS)
        .filter((slot) => !(own && isInSlot(own, date, slot.slotStart)))
        .map((slot) => ({
            ...slot,
            available:
                !FULL_SLOT_STARTS.includes(slot.slotStart) &&
                !takenSlots.has(slotKey(date, slot.slotStart)) &&
                doctors.some((doctor) => countDoctorAppointments(appointments, doctor.doctorId, date, slot.slotStart, own?.id) === 0),
        }));
};

const pickDoctor = (appointments, { date, timeSlotStart, doctorId }, ownId) => {
    if (doctorId) return MOCK_DOCTORS.find((doctor) => doctor.doctorId === Number(doctorId));
    const counts = MOCK_DOCTORS.map((doctor) => countDoctorAppointments(appointments, doctor.doctorId, date, timeSlotStart, ownId));
    return MOCK_DOCTORS[counts.indexOf(Math.min(...counts))];
};

const runChange = async (appointmentId, buildPatch, checkTarget = () => null) => {
    await wait(MOCK_DELAY_MS);
    const mode = readMockMode();
    const data = getMockCurrentUser()?.id === MOCK_DASHBOARD_PATIENT_ID && mode !== "empty" ? buildPatientDashboardData(new Date(), mode) : null;
    const appointment = data && findAppointment(data.appointments, Number(appointmentId));
    if (!appointment) return actionFailure("NOT_FOUND");
    if (mode === "action-not-allowed") {
        recordPatch(appointment.id, { status: APPOINTMENT_STATUS.CONFIRMED, confirmedAt: new Date().toISOString() });
        return actionFailure("NOT_ALLOWED", { status: APPOINTMENT_STATUS.CONFIRMED });
    }
    if (appointment.status !== APPOINTMENT_STATUS.PENDING) return actionFailure("NOT_ALLOWED", { status: appointment.status });
    if (mode === "action-deadline" || !isChangeAllowed(appointment)) return actionFailure("DEADLINE");
    const targetCode = checkTarget(data, appointment, mode);
    if (targetCode) return actionFailure(targetCode);
    if (mode === "action-error") return failure(GENERIC_ERROR_MESSAGE);
    recordPatch(appointment.id, buildPatch(appointment, data));
    return success(buildDetail(data, appointment.id));
};

export const getDoctorOptions = () => MOCK_DOCTORS;

export const getAvailableSlots = ({ date, doctorId = "", appointmentId }) =>
    loadMock((data) => buildSlots(data, { date, doctorId, appointmentId }, readMockMode()));

export const rescheduleMyAppointment = (appointmentId, { date, timeSlotStart, doctorId = "" }) =>
    runChange(
        appointmentId,
        (appointment, data) => {
            const doctor = pickDoctor(data.appointments.map(applyPatch), { date, timeSlotStart, doctorId }, appointment.id);
            return {
                appointmentDate: date,
                timeSlotStart,
                timeSlotEnd: SLOT_GRID.find((slot) => slot.slotStart === timeSlotStart).slotEnd,
                doctorId: doctor.doctorId,
                doctorName: doctor.doctorName,
            };
        },
        (data, appointment, mode) => {
            const appointments = data.appointments.map(applyPatch);
            if (appointments.some((item) => item.id !== appointment.id && OVERLAP_STATUSES.includes(item.status) && isInSlot(item, date, timeSlotStart))) return "OVERLAP";
            if (mode === "slot-taken" && !slotTakenUsed) {
                slotTakenUsed = true;
                takenSlots.add(slotKey(date, timeSlotStart));
                return "SLOT_TAKEN";
            }
            const slot = buildSlots(data, { date, doctorId, appointmentId: appointment.id }, mode).find((item) => item.slotStart === timeSlotStart);
            return slot?.available ? null : "SLOT_TAKEN";
        },
    );

export const cancelMyAppointment = (appointmentId, { reason }) =>
    runChange(appointmentId, () => ({
        status: APPOINTMENT_STATUS.CANCELLED,
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason.trim(),
    }));
