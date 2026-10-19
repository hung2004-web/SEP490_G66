import { generatePath } from "react-router-dom";

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
    TREATMENT_PLANS: "/treatment-plans",
    MEDICAL_RECORD: "/medical-record",
    INVOICES: "/invoices",
    // Staff pages use a prefix per role so they never clash with the patient pages above.
    WORK_SCHEDULE: "/work-schedule",
    DOCTOR_APPOINTMENTS: "/doctor/appointments",
    DOCTOR_PATIENTS: "/doctor/patients",
    DOCTOR_TREATMENT_PLANS: "/doctor/treatment-plans",
    DOCTOR_IMAGING_REQUESTS: "/doctor/imaging-requests",
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
    ADMIN_REPORTS: "/admin/reports",
    ERROR: "/error/:code",
};

export const getServiceDetailRoute = (serviceId) => generatePath(ROUTES.SERVICE_DETAIL, { serviceId: String(serviceId) });

export const getErrorRoute = (code) => generatePath(ROUTES.ERROR, { code: String(code) });

export const getPostLoginRoute = () => ROUTES.DASHBOARD;
