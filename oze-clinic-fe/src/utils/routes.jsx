import { generatePath } from "react-router-dom";
import { USER_ROLES } from "./messages";

export const ROUTES = {
    HOME: "/",
    SIGN_IN: "/login",
    REGISTER: "/register",
    ABOUT_US: "/about-us",
    FORGOT_PASSWORD: "/forgot-password",
    VERIFY_OTP: "/verify-otp",
    RESET_PASSWORD: "/reset-password",
    SERVICES: "/services",
    SERVICE_DETAIL: "/services/:serviceId",
    DOCTORS: "/doctors",
    CONTACT: "/contact",
    BOOK_APPOINTMENT: "/book-appointment",
    PROFILE: "/profile",
    PROFILE_VERIFY_OTP: "/profile/verify-otp",
    CHANGE_PASSWORD: "/change-password",
    DASHBOARD: "/dashboard",
    APPOINTMENTS: "/appointments",
    MEDICAL_RECORD: "/medical-record",
    APPOINTMENT_DETAIL: "/appointments/:appointmentId",
    MEDICAL_RECORD_DETAIL: "/medical-record/:examinationId",
    // Patient payments share one prefix; no path is a prefix of another, so only one sidebar item is active.
    PAYMENT_DEBTS: "/payments/debts",
    PAYMENT_HISTORY: "/payments/history",
    REFUND_REQUESTS: "/payments/refunds",
    // Staff pages use a prefix per role so they never clash with the patient pages above.
    WORK_SCHEDULE: "/work-schedule",
    DOCTOR_APPOINTMENTS: "/doctor/appointments",
    DOCTOR_PATIENTS: "/doctor/patients",
    DOCTOR_TREATMENT_PLANS: "/doctor/treatment-plans",
    DOCTOR_IMAGING_REQUESTS: "/doctor/imaging-requests",
    DOCTOR_QUEUE: "/doctor/queue",
    DOCTOR_IMAGING_REVIEWS: "/doctor/imaging-reviews",
    TECHNICIAN_IMAGING_REQUESTS: "/technician/imaging-requests",
    TECHNICIAN_IMAGING_RESULTS: "/technician/imaging-results",
    RECEPTION_APPOINTMENTS: "/reception/appointments",
    RECEPTION_CHECK_IN: "/reception/check-in",
    RECEPTION_PATIENTS: "/reception/patients",
    RECEPTION_CONSULTATIONS: "/reception/consultations",
    RECEPTION_INVOICES: "/reception/invoices",
    ADMIN_STAFF: "/admin/staff",
    ADMIN_ROLES: "/admin/roles",
    ADMIN_ROOMS: "/admin/rooms",
    ADMIN_SERVICES: "/admin/services",
    ADMIN_WORK_SHIFTS: "/admin/work-shifts",
    ADMIN_LEAVE_REQUESTS: "/admin/leave-requests",
    ADMIN_REFUNDS: "/admin/refunds",
    ADMIN_DEBTS: "/admin/debts",
    ADMIN_SYSTEM_LOGS: "/admin/system-logs",
    ADMIN_SETTINGS: "/admin/settings",
    ERROR: "/error/:code",
};

// Pages only some roles may open.
export const ROLE_ROUTES = [
    {
        roles: [USER_ROLES.PATIENT],
        paths: [ROUTES.APPOINTMENTS, ROUTES.MEDICAL_RECORD, ROUTES.PAYMENT_DEBTS, ROUTES.PAYMENT_HISTORY, ROUTES.REFUND_REQUESTS]
    },
    {
        roles: [USER_ROLES.DOCTOR],
        paths: [
            ROUTES.DOCTOR_QUEUE,
            ROUTES.DOCTOR_IMAGING_REVIEWS,
            ROUTES.DOCTOR_APPOINTMENTS,
            ROUTES.DOCTOR_PATIENTS,
            ROUTES.DOCTOR_TREATMENT_PLANS,
            ROUTES.DOCTOR_IMAGING_REQUESTS,
        ]
    },
    {
        roles: [USER_ROLES.DENTAL_IMAGING_TECHNICIAN],
        paths: [ROUTES.TECHNICIAN_IMAGING_REQUESTS, ROUTES.TECHNICIAN_IMAGING_RESULTS]
    },
    {
        roles: [USER_ROLES.RECEPTIONIST],
        paths: [ROUTES.RECEPTION_APPOINTMENTS, ROUTES.RECEPTION_CHECK_IN, ROUTES.RECEPTION_PATIENTS, ROUTES.RECEPTION_CONSULTATIONS, ROUTES.RECEPTION_INVOICES]
    },
    {
        roles: [USER_ROLES.CLINIC_MANAGER],
        paths: [
            ROUTES.ADMIN_STAFF,
            ROUTES.ADMIN_ROLES,
            ROUTES.ADMIN_WORK_SHIFTS,
            ROUTES.ADMIN_LEAVE_REQUESTS,
            ROUTES.ADMIN_ROOMS,
            ROUTES.ADMIN_SERVICES,
            ROUTES.ADMIN_REFUNDS,
            ROUTES.ADMIN_DEBTS,
            ROUTES.ADMIN_SYSTEM_LOGS,
            ROUTES.ADMIN_SETTINGS,
        ]
    },
    {
        roles: [USER_ROLES.DOCTOR, USER_ROLES.DENTAL_IMAGING_TECHNICIAN, USER_ROLES.RECEPTIONIST],
        paths: [ROUTES.WORK_SCHEDULE]
    }
];

export const getServiceDetailRoute = (serviceId) => generatePath(ROUTES.SERVICE_DETAIL, { serviceId: String(serviceId) });

export const getAppointmentDetailRoute = (appointmentId) => generatePath(ROUTES.APPOINTMENT_DETAIL, { appointmentId: String(appointmentId) });

// Tabs of the Sổ khám bệnh page (?tab=), named as in the patient prototype.
export const MEDICAL_RECORD_TABS = { PLAN: "plan" };

// Treatment plans live in the Sổ khám bệnh "Kế hoạch điều trị" tab; with a planId that plan is opened.
export const getTreatmentPlanRoute = (planId) => {
    const params = new URLSearchParams({ tab: MEDICAL_RECORD_TABS.PLAN });
    if (planId != null) params.set("plan", String(planId));
    return `${ROUTES.MEDICAL_RECORD}?${params}`;
};

// The cost of one visit is shown in Lịch sử thanh toán, opened on that invoice.
export const getPaymentHistoryRoute = (invoiceId) => `${ROUTES.PAYMENT_HISTORY}?${new URLSearchParams({ invoice: String(invoiceId) })}`;

export const getMedicalRecordDetailRoute = (examinationId) => generatePath(ROUTES.MEDICAL_RECORD_DETAIL, { examinationId: String(examinationId) });

export const getErrorRoute = (code) => generatePath(ROUTES.ERROR, { code: String(code) });

export const getPostLoginRoute = (role) => (role === USER_ROLES.PATIENT ? ROUTES.HOME : ROUTES.DASHBOARD);
