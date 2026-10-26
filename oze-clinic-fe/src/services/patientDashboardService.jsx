import { getMockCurrentUser } from "../utils/data/mockData";
import { MOCK_DASHBOARD_PATIENT_ID, buildPatientDashboardData } from "../utils/data/mockPatientDashboard";
import { GENERIC_ERROR_MESSAGE } from "../utils/messages";

const MOCK_DELAY_MS = 300;
const MOCK_SWITCH_KEY = "mock_patient_dashboard";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data) => ({ success: true, message: null, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const readMockMode = () => (import.meta.env.DEV ? localStorage.getItem(MOCK_SWITCH_KEY) : null);

const loadMock = async (pick) => {
    await wait(MOCK_DELAY_MS);
    const mode = readMockMode();
    if (mode === "error") return failure(GENERIC_ERROR_MESSAGE);
    if (getMockCurrentUser()?.id !== MOCK_DASHBOARD_PATIENT_ID || mode === "empty") return success([]);
    return success(pick(buildPatientDashboardData(new Date(), mode)));
};

export const getMyAppointments = () => loadMock((data) => data.appointments);

export const getMyTreatmentPlans = () => loadMock((data) => data.treatmentPlans);

export const getMyInvoices = () => loadMock((data) => data.invoices);
