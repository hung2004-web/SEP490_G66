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
import RoomManagement from "../pages/admin/RoomManagement";
import GlobalException from "../pages/globalException/GlobalException";
import GlobalErrorListener from "../components/error/GlobalErrorListener";
import useSession from "../hooks/useSession";
import { ROUTES, ROLE_ROUTES, getErrorRoute } from "../utils/routes";
import RequireRole from "./RequireRole";

// Placeholder for pages not built yet. Error pages never render inside a layout, so it goes to /error/404.
const NOT_FOUND = <Navigate to={getErrorRoute(404)} replace />;
const SHELL_NOT_FOUND = <GlobalException code={404} inShell />;

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
        element: SHELL_NOT_FOUND
    }
]

// Role pages (ROLE_ROUTES) that are built so far; the rest are placeholders.
const ROLE_PAGES = {
    [ROUTES.ADMIN_ROOMS]: <RoomManagement />
}

const toRoleRoutes = (paths) => paths.map((path) => ({ path: `${path}/*`, element: ROLE_PAGES[path] ?? SHELL_NOT_FOUND }))

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
                        {token && renderRoutes(sessionRoutes.map((route) => (route.element === NOT_FOUND ? { ...route, element: SHELL_NOT_FOUND } : route)))}
                        {renderRoutes(sharedRoutes)}
                        {ROLE_ROUTES.map(({ roles, paths }) => (
                            <Route key={roles.join()} element={<RequireRole roles={roles} />}>
                                {renderRoutes(toRoleRoutes(paths))}
                            </Route>
                        ))}
                        {token && <Route path="*" element={SHELL_NOT_FOUND} />}
                    </Route>
                </Route>
                {renderRoutes(token ? errorRoutes.filter((route) => route.path !== "*") : errorRoutes)}
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
