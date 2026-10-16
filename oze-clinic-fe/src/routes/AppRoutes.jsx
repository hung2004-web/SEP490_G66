import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import GlobalException from "../pages/globalException/GlobalException";
import GlobalErrorListener from "../components/error/GlobalErrorListener";
import useSession from "../hooks/useSession";
import { USER_ROLES } from "../utils/messages";
import { ROUTES } from "../utils/routes";
import RequireRole from "./RequireRole";

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
    },
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
        element: <GlobalException code={404} />
    }
]

const sharedRoutes = [
    {
        path: ROUTES.DASHBOARD,
        element: <GlobalException code={404} />
    },
    {
        path: ROUTES.PROFILE,
        element: <GlobalException code={404} />
    },
    {
        path: ROUTES.CHANGE_PASSWORD,
        element: <GlobalException code={404} />
    }
]

const patientRoutes = [ROUTES.APPOINTMENTS, ROUTES.TREATMENT_PLANS, ROUTES.MEDICAL_RECORD, ROUTES.INVOICES].map((path) => ({
    path: `${path}/*`,
    element: <GlobalException code={404} />
}))

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
                        <Route element={<RequireRole roles={[USER_ROLES.PATIENT]} />}>
                            {renderRoutes(patientRoutes)}
                        </Route>
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
