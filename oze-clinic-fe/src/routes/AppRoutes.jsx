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
import ReceptionCheckIn from "../pages/receptionist/ReceptionCheckIn";
import ReceptionDebts from "../pages/receptionist/ReceptionDebts";
import ReceptionInvoices from "../pages/receptionist/ReceptionInvoices";
import ReceptionPatients from "../pages/receptionist/ReceptionPatients";
import ReceptionConsultations from "../pages/receptionist/ReceptionConsultations";
import DailyReconciliation from "../pages/admin/DailyReconciliation";
import ReceptionConfirm from "../pages/receptionist/ReceptionConfirm";
import ReceptionFollowUps from "../pages/receptionist/ReceptionFollowUps";
import ReceptionPayment from "../pages/receptionist/ReceptionPayment";
import ReceptionQueue from "../pages/receptionist/ReceptionQueue";
import CashHandover from "../pages/receptionist/CashHandover";
import WorkSchedule from "../pages/common/WorkSchedule";
import MyAppointments from "../pages/patient/MyAppointments";
import AppointmentDetail from "../pages/patient/AppointmentDetail";
import MedicalRecord from "../pages/patient/MedicalRecord";
import BookAppointment from "../pages/patient/BookAppointment";
import PaymentDebts from "../pages/patient/PaymentDebts";
import PaymentHistory from "../pages/patient/PaymentHistory";
import RefundRequests from "../pages/patient/RefundRequests";
import AuditLogManagement from "../pages/admin/AuditLogManagement";
import LeaveRequestManagement from "../pages/admin/LeaveRequestManagement";
import RefundRequestManagement from "../pages/admin/RefundRequestManagement";
import RoomManagement from "../pages/admin/RoomManagement";
import ServiceManagement from "../pages/admin/ServiceManagement";
import StaffManagement from "../pages/admin/StaffManagement";
import WorkShiftManagement from "../pages/admin/WorkShiftManagement";
import SystemSettings from "../pages/admin/SystemSettings";
import ExaminationPage from "../pages/doctor/ExaminationPage";
import ImagingReviewPage from "../pages/doctor/ImagingReviewPage";
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
    // Receptionist sidebar pages open the counter workspace on the matching tab
    [ROUTES.RECEPTION_APPOINTMENTS]: <ReceptionConfirm />,
    [ROUTES.RECEPTION_CHECK_IN]: <ReceptionCheckIn />,
    [ROUTES.RECEPTION_INVOICES]: <ReceptionPayment />,
    [ROUTES.RECEPTION_QUEUE]: <ReceptionQueue />,
    [ROUTES.RECEPTION_FOLLOW_UPS]: <ReceptionFollowUps />,
    [ROUTES.RECEPTION_DEBTS]: <ReceptionDebts />,
    [ROUTES.RECEPTION_INVOICE_LIST]: <ReceptionInvoices />,
    [ROUTES.RECEPTION_PATIENTS]: <ReceptionPatients />,
    [ROUTES.RECEPTION_CONSULTATIONS]: <ReceptionConsultations />,
    [ROUTES.RECEPTION_CASH_HANDOVER]: <CashHandover />,
    [ROUTES.WORK_SCHEDULE]: <WorkSchedule />,
    [ROUTES.APPOINTMENTS]: (
        <Routes>
            <Route index element={<MyAppointments />} />
            <Route path=":appointmentId" element={<AppointmentDetail />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.BOOK_APPOINTMENT]: (
        <Routes>
            <Route index element={<BookAppointment />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.MEDICAL_RECORD]: (
        <Routes>
            <Route path=":examinationId?" element={<MedicalRecord />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.PAYMENT_DEBTS]: (
        <Routes>
            <Route path=":debtId?" element={<PaymentDebts />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.PAYMENT_HISTORY]: (
        <Routes>
            <Route index element={<PaymentHistory />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.REFUND_REQUESTS]: (
        <Routes>
            <Route index element={<RefundRequests />} />
            <Route path="*" element={NOT_FOUND} />
        </Routes>
    ),
    [ROUTES.DOCTOR_EXAMINATION]: <ExaminationPage />,
    [ROUTES.DOCTOR_IMAGING_REVIEWS]: <ImagingReviewPage />,
    [ROUTES.ADMIN_ROOMS]: <RoomManagement />,
    [ROUTES.ADMIN_SERVICES]: <ServiceManagement />,
    [ROUTES.ADMIN_STAFF]: <StaffManagement />,
    [ROUTES.ADMIN_WORK_SHIFTS]: <WorkShiftManagement />,
    [ROUTES.ADMIN_SETTINGS]: <SystemSettings />,
    [ROUTES.ADMIN_SYSTEM_LOGS]: <AuditLogManagement />,
    [ROUTES.ADMIN_LEAVE_REQUESTS]: <LeaveRequestManagement />,
    [ROUTES.ADMIN_REFUNDS]: <RefundRequestManagement />,
    // Real debts from the API; the manager sees them without the receptionist's reminder and payment buttons
    [ROUTES.ADMIN_DEBTS]: <ReceptionDebts forManager />,
    [ROUTES.ADMIN_RECONCILIATION]: <DailyReconciliation />
}

// Titles of the sidebar pages not built yet (same labels as the sidebar); they show ComingSoonPage inside the layout.
const COMING_SOON_TITLES = {
    [ROUTES.APPOINTMENTS]: "Lịch hẹn của tôi",
    [ROUTES.DOCTOR_APPOINTMENTS]: "Lịch hẹn khám",
    [ROUTES.DOCTOR_PATIENTS]: "Bệnh nhân",
    [ROUTES.DOCTOR_TREATMENT_PLANS]: "Kế hoạch điều trị",
    [ROUTES.DOCTOR_IMAGING_REQUESTS]: "Yêu cầu chụp phim",
    [ROUTES.TECHNICIAN_IMAGING_REQUESTS]: "Yêu cầu chụp phim",
    [ROUTES.TECHNICIAN_IMAGING_RESULTS]: "Kết quả hình ảnh",
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
