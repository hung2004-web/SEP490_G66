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
    CHANGE_PASSWORD: "/change-password",
    DASHBOARD: "/dashboard",
    APPOINTMENTS: "/appointments",
    TREATMENT_PLANS: "/treatment-plans",
    MEDICAL_RECORD: "/medical-record",
    INVOICES: "/invoices",
    QUEUE: "/queue",
    WORK_SHIFTS: "/work-shifts",
    ERROR: "/error/:code",
};

export const getServiceDetailRoute = (serviceId) => generatePath(ROUTES.SERVICE_DETAIL, { serviceId: String(serviceId) });

export const getErrorRoute = (code) => generatePath(ROUTES.ERROR, { code: String(code) });

export const getPostLoginRoute = () => ROUTES.DASHBOARD;
