import {
    Briefcase,
    Building2,
    CalendarDays,
    ChartColumn,
    ClipboardList,
    LayoutDashboard,
    Receipt,
    ScanLine,
    Shield,
    Stethoscope,
    User,
    Users,
    Wallet,
} from "lucide-react";
import { USER_ROLES } from "./messages";
import { ROUTES } from "./routes";

// Sidebar tree per role. A node is either
//   a link:  { key, label, icon, to }
//   a group: { key, label, icon, children: [{ key, label, to, badge? }] }
// badge names a count the sidebar looks up (see useSidebarBadges in Sidebar.jsx); 0 shows nothing.
// A new page also needs its path in ROUTES / ROLE_ROUTES (utils/routes.jsx).

export const SIDEBAR_BADGES = {
    PENDING_LEAVES: "pendingLeaves",
    PENDING_REFUNDS: "pendingRefunds",
};

const DASHBOARD_LINK = { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard, to: ROUTES.DASHBOARD };

const WORK_GROUP = {
    key: "work",
    label: "Công việc",
    icon: Briefcase,
    children: [{ key: "work-schedule", label: "Lịch làm việc", to: ROUTES.WORK_SCHEDULE }],
};

const ACCOUNT_GROUP = {
    key: "account",
    label: "Cá nhân",
    icon: User,
    children: [
        { key: "profile", label: "Hồ sơ cá nhân", to: ROUTES.PROFILE },
        { key: "change-password", label: "Đổi mật khẩu", to: ROUTES.CHANGE_PASSWORD },
    ],
};

const SIDEBAR_MENU = {
    [USER_ROLES.CLINIC_MANAGER]: [
        { key: "reports", label: "Tổng quan", icon: ChartColumn, to: ROUTES.DASHBOARD },
        {
            key: "staff",
            label: "Nhân sự",
            icon: Users,
            children: [
                { key: "accounts", label: "Nhân viên", to: ROUTES.ADMIN_STAFF },
                { key: "work-shifts", label: "Ca làm việc", to: ROUTES.ADMIN_WORK_SHIFTS },
                { key: "leave-requests", label: "Đơn xin nghỉ", to: ROUTES.ADMIN_LEAVE_REQUESTS, badge: SIDEBAR_BADGES.PENDING_LEAVES },
            ],
        },
        {
            key: "operations",
            label: "Vận hành",
            icon: Building2,
            children: [
                { key: "rooms", label: "Phòng", to: ROUTES.ADMIN_ROOMS },
                { key: "services", label: "Dịch vụ", to: ROUTES.ADMIN_SERVICES },
            ],
        },
        {
            key: "finance",
            label: "Tài chính",
            icon: Wallet,
            children: [{ key: "refunds", label: "Duyệt hoàn tiền", to: ROUTES.ADMIN_REFUNDS, badge: SIDEBAR_BADGES.PENDING_REFUNDS }],
        },
        {
            key: "system",
            label: "Hệ thống",
            icon: Shield,
            children: [
                { key: "system-logs", label: "Nhật ký hệ thống", to: ROUTES.ADMIN_SYSTEM_LOGS },
                { key: "settings", label: "Cài đặt", to: ROUTES.ADMIN_SETTINGS },
            ],
        },
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.DOCTOR]: [
        DASHBOARD_LINK,
        {
            key: "clinical",
            label: "Khám chữa bệnh",
            icon: Stethoscope,
            children: [
                { key: "appointments", label: "Lịch hẹn khám", to: ROUTES.DOCTOR_APPOINTMENTS },
                { key: "patients", label: "Bệnh nhân", to: ROUTES.DOCTOR_PATIENTS },
                { key: "treatment-plans", label: "Kế hoạch điều trị", to: ROUTES.DOCTOR_TREATMENT_PLANS },
                { key: "imaging-requests", label: "Yêu cầu chụp phim", to: ROUTES.DOCTOR_IMAGING_REQUESTS },
            ],
        },
        WORK_GROUP,
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.DENTAL_IMAGING_TECHNICIAN]: [
        DASHBOARD_LINK,
        {
            key: "imaging",
            label: "Chẩn đoán hình ảnh",
            icon: ScanLine,
            children: [
                { key: "imaging-requests", label: "Yêu cầu chụp phim", to: ROUTES.TECHNICIAN_IMAGING_REQUESTS },
                { key: "imaging-results", label: "Kết quả hình ảnh", to: ROUTES.TECHNICIAN_IMAGING_RESULTS },
            ],
        },
        WORK_GROUP,
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.RECEPTIONIST]: [
        DASHBOARD_LINK,
        {
            key: "appointments",
            label: "Lịch hẹn",
            icon: CalendarDays,
            children: [
                { key: "manage-appointments", label: "Quản lý lịch hẹn", to: ROUTES.RECEPTION_APPOINTMENTS },
                { key: "check-in", label: "Tiếp đón bệnh nhân", to: ROUTES.RECEPTION_CHECK_IN },
            ],
        },
        {
            key: "patients",
            label: "Bệnh nhân",
            icon: Users,
            children: [
                { key: "patient-list", label: "Bệnh nhân", to: ROUTES.RECEPTION_PATIENTS },
                { key: "consultations", label: "Yêu cầu tư vấn", to: ROUTES.RECEPTION_CONSULTATIONS },
            ],
        },
        {
            key: "finance",
            label: "Tài chính",
            icon: Wallet,
            children: [{ key: "invoices", label: "Thanh toán", to: ROUTES.RECEPTION_INVOICES }],
        },
        WORK_GROUP,
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.PATIENT]: [
        DASHBOARD_LINK,
        {
            key: "appointments",
            label: "Lịch hẹn",
            icon: CalendarDays,
            children: [
                { key: "book-appointment", label: "Đặt lịch hẹn", to: ROUTES.BOOK_APPOINTMENT },
                { key: "my-appointments", label: "Lịch hẹn của tôi", to: ROUTES.APPOINTMENTS },
            ],
        },
        {
            key: "treatment",
            label: "Điều trị",
            icon: ClipboardList,
            children: [
                { key: "treatment-plans", label: "Kế hoạch điều trị", to: ROUTES.TREATMENT_PLANS },
                { key: "medical-record", label: "Hồ sơ bệnh án", to: ROUTES.MEDICAL_RECORD },
            ],
        },
        {
            key: "billing",
            label: "Thanh toán",
            icon: Receipt,
            children: [{ key: "invoices", label: "Hóa đơn", to: ROUTES.INVOICES }],
        },
        ACCOUNT_GROUP,
    ],
};

export const getSidebarMenu = (role) => (Object.hasOwn(SIDEBAR_MENU, role) ? SIDEBAR_MENU[role] : []);
