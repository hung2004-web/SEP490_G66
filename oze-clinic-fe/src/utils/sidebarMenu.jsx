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
    WAITING_PATIENTS: "waitingPatients",
    PENDING_IMAGING_REVIEWS: "pendingImagingReviews",
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
        { key: "reports", label: "Báo cáo", icon: ChartColumn, to: ROUTES.DASHBOARD },
        {
            key: "operations",
            label: "Vận hành",
            icon: Building2,
            children: [
                { key: "work-shifts", label: "Phân ca", to: ROUTES.ADMIN_WORK_SHIFTS },
                { key: "leave-requests", label: "Đơn xin nghỉ", to: ROUTES.ADMIN_LEAVE_REQUESTS, badge: SIDEBAR_BADGES.PENDING_LEAVES },
                { key: "refunds", label: "Duyệt hoàn tiền", to: ROUTES.ADMIN_REFUNDS, badge: SIDEBAR_BADGES.PENDING_REFUNDS },
                { key: "debts", label: "Công nợ", to: ROUTES.ADMIN_DEBTS },
            ],
        },
        {
            key: "catalog",
            label: "Danh mục",
            icon: Users,
            children: [
                { key: "services", label: "Dịch vụ", to: ROUTES.ADMIN_SERVICES },
                { key: "rooms", label: "Phòng", to: ROUTES.ADMIN_ROOMS },
                { key: "accounts", label: "Tài khoản & nhân sự", to: ROUTES.ADMIN_STAFF },
            ],
        },
        {
            key: "system",
            label: "Hệ thống",
            icon: Shield,
            children: [
                { key: "system-logs", label: "Nhật ký hệ thống", to: ROUTES.ADMIN_SYSTEM_LOGS },
                { key: "settings", label: "Cấu hình hệ thống", to: ROUTES.ADMIN_SETTINGS },
            ],
        },
    ],
    [USER_ROLES.DOCTOR]: [
        DASHBOARD_LINK,
        {
            key: "clinical",
            label: "Khám bệnh",
            icon: Stethoscope,
            children: [
                { key: "queue", label: "Hàng chờ khám", to: ROUTES.DOCTOR_QUEUE, badge: SIDEBAR_BADGES.WAITING_PATIENTS },
                { key: "imaging-reviews", label: "Duyệt kết quả chụp", to: ROUTES.DOCTOR_IMAGING_REVIEWS, badge: SIDEBAR_BADGES.PENDING_IMAGING_REVIEWS },
            ],
        },
        { ...ACCOUNT_GROUP, children: [...WORK_GROUP.children, ...ACCOUNT_GROUP.children] },
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
                { key: "my-appointments", label: "Lịch hẹn của tôi", to: ROUTES.APPOINTMENTS },
                { key: "book-appointment", label: "Đặt lịch hẹn", to: ROUTES.BOOK_APPOINTMENT },
            ],
        },
        {
            key: "treatment",
            label: "Điều trị",
            icon: ClipboardList,
            children: [{ key: "medical-record", label: "Sổ khám bệnh", to: ROUTES.MEDICAL_RECORD }],
        },
        {
            key: "billing",
            label: "Thanh toán",
            icon: Receipt,
            children: [
                { key: "debts", label: "Công nợ & đợt thanh toán", to: ROUTES.PAYMENT_DEBTS },
                { key: "payment-history", label: "Lịch sử thanh toán", to: ROUTES.PAYMENT_HISTORY },
                { key: "refund-requests", label: "Yêu cầu hoàn tiền", to: ROUTES.REFUND_REQUESTS },
            ],
        },
        ACCOUNT_GROUP,
    ],
};

export const getSidebarMenu = (role) => (Object.hasOwn(SIDEBAR_MENU, role) ? SIDEBAR_MENU[role] : []);
