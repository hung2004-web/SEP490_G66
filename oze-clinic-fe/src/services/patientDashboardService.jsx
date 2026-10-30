import { getMockCurrentUser } from "../utils/data/mockData";
import { MOCK_DASHBOARD_PATIENT_ID, MOCK_VISIT_SUMMARIES, buildPatientDashboardData } from "../utils/data/mockPatientDashboard";
import { toClinicDateTime } from "../utils/format";
import { APPOINTMENT_CHANGE_DEADLINE_HOURS, APPOINTMENT_STATUS, GENERIC_ERROR_MESSAGE } from "../utils/messages";

const MOCK_DELAY_MS = 300;
const MOCK_SWITCH_KEY = "mock_patient_dashboard";
const HOUR_MS = 60 * 60 * 1000;

const appointmentPatches = new Map();

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
