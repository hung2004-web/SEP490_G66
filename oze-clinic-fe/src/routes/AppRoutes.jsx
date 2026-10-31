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
import ChangePasswordPage from "../pages/common/ChangePasswordPage";
import ComingSoonPage from "../pages/common/ComingSoonPage";
import MyAppointments from "../pages/patient/MyAppointments";
import RoomManagement from "../pages/admin/RoomManagement";
import ServiceManagement from "../pages/admin/ServiceManagement";
import GlobalException from "../pages/globalException/GlobalException";
import GlobalErrorListener from "../components/error/GlobalErrorListener";
import useSession from "../hooks/useSession";
import { ROUTES, ROLE_ROUTES, getErrorRoute } from "../utils/routes";
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
        element: <ChangePasswordPage />
    }
]

// Role pages (ROLE_ROUTES) that are built so far.
const ROLE_PAGES = {
    [ROUTES.APPOINTMENTS]: (
        <Routes>
            <Route index element={<MyAppointments />} />
            <Route path="*" element={<ComingSoonPage title="Lịch hẹn của tôi" />} />
        </Routes>
    ),
    [ROUTES.ADMIN_ROOMS]: <RoomManagement />,
    [ROUTES.ADMIN_SERVICES]: <ServiceManagement />
}

// Titles of the sidebar pages not built yet (same labels as the sidebar); they show ComingSoonPage inside the layout.
const COMING_SOON_TITLES = {
    [ROUTES.APPOINTMENTS]: "Lịch hẹn của tôi",
    [ROUTES.TREATMENT_PLANS]: "Kế hoạch điều trị",
    [ROUTES.MEDICAL_RECORD]: "Hồ sơ bệnh án",
    [ROUTES.INVOICES]: "Hóa đơn",
    [ROUTES.DOCTOR_QUEUE]: "Hàng chờ khám",
    [ROUTES.DOCTOR_IMAGING_REVIEWS]: "Duyệt kết quả chụp",
    [ROUTES.DOCTOR_REFUND_REVIEWS]: "Duyệt hoàn tiền",
    [ROUTES.DOCTOR_APPOINTMENTS]: "Lịch hẹn khám",
    [ROUTES.DOCTOR_PATIENTS]: "Bệnh nhân",
    [ROUTES.DOCTOR_TREATMENT_PLANS]: "Kế hoạch điều trị",
    [ROUTES.DOCTOR_IMAGING_REQUESTS]: "Yêu cầu chụp phim",
    [ROUTES.TECHNICIAN_IMAGING_REQUESTS]: "Yêu cầu chụp phim",
    [ROUTES.TECHNICIAN_IMAGING_RESULTS]: "Kết quả hình ảnh",
    [ROUTES.RECEPTION_APPOINTMENTS]: "Quản lý lịch hẹn",
    [ROUTES.RECEPTION_CHECK_IN]: "Tiếp đón bệnh nhân",
    [ROUTES.RECEPTION_PATIENTS]: "Bệnh nhân",
    [ROUTES.RECEPTION_CONSULTATIONS]: "Yêu cầu tư vấn",
    [ROUTES.RECEPTION_INVOICES]: "Thanh toán",
    [ROUTES.WORK_SCHEDULE]: "Lịch làm việc",
    [ROUTES.ADMIN_STAFF]: "Tài khoản & nhân sự",
    [ROUTES.ADMIN_ROLES]: "Vai trò",
    [ROUTES.ADMIN_WORK_SHIFTS]: "Ca làm việc",
    [ROUTES.ADMIN_LEAVE_REQUESTS]: "Đơn xin nghỉ",
    [ROUTES.ADMIN_REFUNDS]: "Duyệt hoàn tiền",
    [ROUTES.ADMIN_SYSTEM_LOGS]: "Nhật ký hệ thống",
    [ROUTES.ADMIN_SETTINGS]: "Cài đặt",
}

const getRolePage = (path) =>
    ROLE_PAGES[path] ?? (COMING_SOON_TITLES[path] ? <ComingSoonPage title={COMING_SOON_TITLES[path]} /> : NOT_FOUND)

const toRoleRoutes = (paths) => paths.map((path) => ({ path: `${path}/*`, element: getRolePage(path) }))

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
                        {token && <Route path={ROUTES.BOOK_APPOINTMENT} element={<ComingSoonPage title="Đặt lịch hẹn" />} />}
                        {renderRoutes(sharedRoutes)}
                        {ROLE_ROUTES.map(({ roles, paths }) => (
                            <Route key={roles.join()} element={<RequireRole roles={roles} />}>
                                {renderRoutes(toRoleRoutes(paths))}
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
