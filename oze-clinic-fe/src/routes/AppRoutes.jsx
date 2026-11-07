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
import AppointmentDetail from "../pages/patient/AppointmentDetail";
import MedicalRecord from "../pages/patient/MedicalRecord";
import AuditLogManagement from "../pages/admin/AuditLogManagement";
import LeaveRequestManagement from "../pages/admin/LeaveRequestManagement";
import RefundRequestManagement from "../pages/admin/RefundRequestManagement";
import DebtManagement from "../pages/admin/DebtManagement";
import RoomManagement from "../pages/admin/RoomManagement";
import ServiceManagement from "../pages/admin/ServiceManagement";
import StaffManagement from "../pages/admin/StaffManagement";
import WorkShiftManagement from "../pages/admin/WorkShiftManagement";
import SystemSettings from "../pages/admin/SystemSettings";
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
            <Route path=":appointmentId" element={<AppointmentDetail />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.MEDICAL_RECORD]: (
        <Routes>
            <Route path=":examinationId?" element={<MedicalRecord />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.ADMIN_ROOMS]: <RoomManagement />,
    [ROUTES.ADMIN_SERVICES]: <ServiceManagement />,
    [ROUTES.ADMIN_STAFF]: <StaffManagement />,
    [ROUTES.ADMIN_WORK_SHIFTS]: <WorkShiftManagement />,
    [ROUTES.ADMIN_SETTINGS]: <SystemSettings />,
    [ROUTES.ADMIN_SYSTEM_LOGS]: <AuditLogManagement />,
    [ROUTES.ADMIN_LEAVE_REQUESTS]: <LeaveRequestManagement />,
    [ROUTES.ADMIN_REFUNDS]: <RefundRequestManagement />,
    [ROUTES.ADMIN_DEBTS]: <DebtManagement />
}

// Titles of the sidebar pages not built yet (same labels as the sidebar); they show ComingSoonPage inside the layout.
const COMING_SOON_TITLES = {
    [ROUTES.APPOINTMENTS]: "Lịch hẹn của tôi",
    [ROUTES.PAYMENT_DEBTS]: "Công nợ & đợt thanh toán",
    [ROUTES.PAYMENT_HISTORY]: "Lịch sử thanh toán",
    [ROUTES.REFUND_REQUESTS]: "Yêu cầu hoàn tiền",
    [ROUTES.DOCTOR_QUEUE]: "Hàng chờ khám",
    [ROUTES.DOCTOR_IMAGING_REVIEWS]: "Duyệt kết quả chụp",
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
    [ROUTES.ADMIN_ROLES]: "Vai trò",
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
