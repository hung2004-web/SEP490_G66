import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import MainLayout from "../layouts/MainLayout";
import ForgotPasswordPage from "../pages/common/ForgotPasswordPage";
import HomePage from "../pages/common/homepage/HomePage";
import Register from "../pages/common/Register";
import ResetPasswordPage from "../pages/common/ResetPasswordPage";
import SignInPage from "../pages/common/SignInPage";
import VerifyOtpPage from "../pages/common/VerifyOtpPage";
import AboutUs from "../pages/common/homepage/AboutUs";
import ContactPage from "../pages/common/ContactPage";
import ServiceDetail from "../pages/common/ServiceDetail";
import DashboardPage from "../pages/common/DashboardPage";
import ProfilePage from "../pages/common/ProfilePage";
import GlobalException from "../pages/globalException/GlobalException";
import GlobalErrorListener from "../components/error/GlobalErrorListener";
import useSession from "../hooks/useSession";
import { USER_ROLES } from "../utils/messages";
import { ROUTES, getErrorRoute } from "../utils/routes";
import RequireRole from "./RequireRole";

// Placeholder for pages not built yet. Error pages never render inside a layout, so it goes to /error/404.
const NOT_FOUND = <Navigate to={getErrorRoute(404)} replace />;

const routes = [
    {
        path: ROUTES.HOME,
        element: <HomePage />
    },
    {
        path: ROUTES.SIGN_IN,
        element: <SignInPage />
    },
    {
        path: ROUTES.REGISTER,
        element: <Register />
    },
    {
        path: ROUTES.ABOUT_US,
        element: <AboutUs />
    },
    {
        path: ROUTES.CONTACT,
        element: <ContactPage />
    },
    {
        path: ROUTES.SERVICE_DETAIL,
        element: <ServiceDetail />
    },
    {
        path: ROUTES.FORGOT_PASSWORD,
        element: <ForgotPasswordPage />
    },
    {
        path: ROUTES.VERIFY_OTP,
        element: <VerifyOtpPage />
    },
    {
        path: ROUTES.RESET_PASSWORD,
        element: <ResetPasswordPage />
    }
]

// Error pages are full screen, outside any layout.
const errorRoutes = [
    {
        path: ROUTES.ERROR,
        element: <GlobalException />
    },
    {
        path: "*",
        element: <GlobalException code={404} />
    }
]

const sessionRoutes = [
    {
        path: ROUTES.BOOK_APPOINTMENT,
        element: NOT_FOUND
    }
]

const sharedRoutes = [
    {
        path: ROUTES.DASHBOARD,
        element: <DashboardPage />
    },
    {
        path: ROUTES.PROFILE,
        element: <ProfilePage />
    },
    {
        path: ROUTES.PROFILE_VERIFY_OTP,
        element: <VerifyOtpPage />
    },
    {
        path: ROUTES.CHANGE_PASSWORD,
        element: NOT_FOUND
    }
]

// Pages only some roles may open. All of them are placeholders for now.
const roleRoutes = [
    {
        roles: [USER_ROLES.PATIENT],
        paths: [ROUTES.APPOINTMENTS, ROUTES.TREATMENT_PLANS, ROUTES.MEDICAL_RECORD, ROUTES.INVOICES]
    },
    {
        roles: [USER_ROLES.DOCTOR],
        paths: [ROUTES.DOCTOR_APPOINTMENTS, ROUTES.DOCTOR_PATIENTS, ROUTES.DOCTOR_TREATMENT_PLANS, ROUTES.DOCTOR_IMAGING_REQUESTS]
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
        paths: [ROUTES.ADMIN_REPORTS, ROUTES.ADMIN_STAFF, ROUTES.ADMIN_ROLES, ROUTES.ADMIN_WORK_SHIFTS, ROUTES.ADMIN_ROOMS, ROUTES.ADMIN_SERVICES]
    },
    {
        roles: [USER_ROLES.DOCTOR, USER_ROLES.DENTAL_IMAGING_TECHNICIAN, USER_ROLES.RECEPTIONIST],
        paths: [ROUTES.WORK_SCHEDULE]
    }
]

const toPlaceholderRoutes = (paths) => paths.map((path) => ({ path: `${path}/*`, element: NOT_FOUND }))

const renderRoutes = (list) =>
    list.map((route) => (
        <Route
            key={route.path}
            path={route.path}
            element={route.element}
        />
    ));

function AppRoutes() {
    const { token } = useSession();

    return (
        <BrowserRouter useTransitions={false}>
            <GlobalErrorListener />
            <Routes>
                <Route element={<MainLayout />}>
                    {renderRoutes(routes)}
                    {!token && renderRoutes(sessionRoutes)}
                </Route>
                <Route element={<RequireRole />}>
                    <Route element={<AppLayout />}>
                        {token && renderRoutes(sessionRoutes)}
                        {renderRoutes(sharedRoutes)}
                        {roleRoutes.map(({ roles, paths }) => (
                            <Route key={roles.join()} element={<RequireRole roles={roles} />}>
                                {renderRoutes(toPlaceholderRoutes(paths))}
                            </Route>
                        ))}
                    </Route>
                </Route>
                {renderRoutes(errorRoutes)}
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
