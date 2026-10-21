import { useEffect, useId, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
    CalendarClock,
    CalendarDays,
    CalendarPlus,
    ChartColumn,
    ClipboardList,
    DoorOpen,
    FileText,
    Images,
    KeyRound,
    LayoutDashboard,
    MessageSquareText,
    Receipt,
    ScanLine,
    ShieldCheck,
    Stethoscope,
    User,
    UserCheck,
    UserCog,
    Users,
    X,
} from "lucide-react";
import useSession from "@/hooks/useSession";
import { cx } from "@/utils/cx";
import { USER_ROLES } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled])";
const SCROLL_LOCK_CLASS = "overflow-hidden";

const ACCOUNT_GROUP = {
    key: "account",
    label: "Tài khoản",
    items: [
        { key: "profile", label: "Hồ sơ cá nhân", icon: User, to: ROUTES.PROFILE },
        { key: "change-password", label: "Đổi mật khẩu", icon: KeyRound, to: ROUTES.CHANGE_PASSWORD },
    ],
};

const DASHBOARD_ITEM = { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard, to: ROUTES.DASHBOARD };
const WORK_SCHEDULE_ITEM = { key: "work-schedule", label: "Lịch làm việc", icon: CalendarClock, to: ROUTES.WORK_SCHEDULE };

const ROLE_GROUPS = {
    [USER_ROLES.DOCTOR]: [
        {
            key: "main",
            items: [
                DASHBOARD_ITEM,
                { key: "appointments", label: "Lịch hẹn khám", icon: CalendarDays, to: ROUTES.DOCTOR_APPOINTMENTS },
                { key: "patients", label: "Bệnh nhân", icon: Users, to: ROUTES.DOCTOR_PATIENTS },
                { key: "treatment-plans", label: "Kế hoạch điều trị", icon: ClipboardList, to: ROUTES.DOCTOR_TREATMENT_PLANS },
                { key: "imaging-requests", label: "Yêu cầu chụp phim", icon: ScanLine, to: ROUTES.DOCTOR_IMAGING_REQUESTS },
                WORK_SCHEDULE_ITEM,
            ],
        },
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.DENTAL_IMAGING_TECHNICIAN]: [
        {
            key: "main",
            items: [
                DASHBOARD_ITEM,
                { key: "imaging-requests", label: "Yêu cầu chụp phim", icon: ScanLine, to: ROUTES.TECHNICIAN_IMAGING_REQUESTS },
                { key: "imaging-results", label: "Kết quả hình ảnh", icon: Images, to: ROUTES.TECHNICIAN_IMAGING_RESULTS },
                WORK_SCHEDULE_ITEM,
            ],
        },
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.RECEPTIONIST]: [
        {
            key: "main",
            items: [
                DASHBOARD_ITEM,
                { key: "appointments", label: "Quản lý lịch hẹn", icon: CalendarDays, to: ROUTES.RECEPTION_APPOINTMENTS },
                { key: "check-in", label: "Tiếp đón bệnh nhân", icon: UserCheck, to: ROUTES.RECEPTION_CHECK_IN },
                { key: "patients", label: "Bệnh nhân", icon: Users, to: ROUTES.RECEPTION_PATIENTS },
                { key: "consultations", label: "Yêu cầu tư vấn", icon: MessageSquareText, to: ROUTES.RECEPTION_CONSULTATIONS },
                { key: "invoices", label: "Thanh toán", icon: Receipt, to: ROUTES.RECEPTION_INVOICES },
                WORK_SCHEDULE_ITEM,
            ],
        },
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.CLINIC_MANAGER]: [
        {
            key: "main",
            items: [DASHBOARD_ITEM, { key: "reports", label: "Báo cáo", icon: ChartColumn, to: ROUTES.ADMIN_REPORTS }],
        },
        {
            key: "management",
            label: "Quản lý",
            items: [
                { key: "staff", label: "Nhân viên", icon: UserCog, to: ROUTES.ADMIN_STAFF },
                { key: "roles", label: "Vai trò", icon: ShieldCheck, to: ROUTES.ADMIN_ROLES },
                { key: "work-shifts", label: "Ca làm việc", icon: CalendarClock, to: ROUTES.ADMIN_WORK_SHIFTS },
                { key: "rooms", label: "Phòng khám", icon: DoorOpen, to: ROUTES.ADMIN_ROOMS },
                { key: "services", label: "Dịch vụ", icon: Stethoscope, to: ROUTES.ADMIN_SERVICES },
            ],
        },
        ACCOUNT_GROUP,
    ],
    [USER_ROLES.PATIENT]: [
        {
            key: "main",
            items: [
                DASHBOARD_ITEM,
                { key: "book-appointment", label: "Đặt lịch hẹn", icon: CalendarPlus, to: ROUTES.BOOK_APPOINTMENT },
                { key: "appointments", label: "Lịch hẹn của tôi", icon: CalendarDays, to: ROUTES.APPOINTMENTS },
                { key: "treatment-plans", label: "Kế hoạch điều trị", icon: ClipboardList, to: ROUTES.TREATMENT_PLANS },
                { key: "medical-record", label: "Hồ sơ bệnh án", icon: FileText, to: ROUTES.MEDICAL_RECORD },
                { key: "invoices", label: "Hóa đơn", icon: Receipt, to: ROUTES.INVOICES },
            ],
        },
        ACCOUNT_GROUP,
    ],
};

const Brand = ({ collapsed }) =>
    collapsed ? (
        <p className="font-heading text-heading-3 font-bold text-ink">OZE</p>
    ) : (
        <div className="min-w-0">
            <p className="truncate font-heading text-heading-3 font-bold text-ink">OZE Dental</p>
            <p className="truncate text-caption text-muted">Hệ thống quản lý phòng khám</p>
        </div>
    );

const SidebarLink = ({ item, collapsed, drawer }) => {
    const Icon = item.icon;

    return (
        <NavLink to={item.to} className={cx("sidebar-item group relative", drawer && "h-11", collapsed && "justify-center px-0")}>
            <Icon aria-hidden="true" />
            <span className={cx("truncate", collapsed && "sr-only")}>{item.label}</span>
            {collapsed && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none invisible absolute left-full top-1/2 z-40 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-surface-navy px-2 py-1 text-caption text-on-navy shadow-sm group-hover:visible group-focus-visible:visible"
                >
                    {item.label}
                </span>
            )}
        </NavLink>
    );
};

const SidebarNav = ({ groups, collapsed = false, drawer = false }) => {
    const labelPrefix = useId();

    return (
        <nav
            aria-label="Thanh bên"
            className={cx("flex min-h-0 flex-1 flex-col p-3", collapsed ? "overflow-visible" : "overflow-y-auto")}
        >
            {groups.map((group, index) => {
                const labelId = `${labelPrefix}-${group.key}`;

                return (
                    <div key={group.key}>
                        {index > 0 && <hr className="my-3 border-border" />}
                        {group.label && (
                            <p id={labelId} className={cx("text-caption text-muted", collapsed ? "sr-only" : "px-3 pb-1")}>
                                {group.label}
                            </p>
                        )}
                        <ul aria-labelledby={group.label ? labelId : undefined} className="flex flex-col gap-1">
                            {group.items.map((item) => (
                                <li key={item.key}>
                                    <SidebarLink item={item} collapsed={collapsed} drawer={drawer} />
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </nav>
    );
};

const SidebarDrawer = ({ id, groups, onClose, returnFocusRef }) => {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);

    useEffect(() => {
        const returnTarget = returnFocusRef?.current;
        document.body.classList.add(SCROLL_LOCK_CLASS);
        closeButtonRef.current?.focus();
        return () => {
            document.body.classList.remove(SCROLL_LOCK_CLASS);
            returnTarget?.focus();
        };
    }, [returnFocusRef]);

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
        }
        if (event.key !== "Tab") return;

        const focusables = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
        const first = focusables[0];
        const last = focusables.at(-1);
        const current = document.activeElement;

        if (!focusables.includes(current)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && current === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && current === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-surface-navy/45 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none"
                onClick={onClose}
            />
            <div
                ref={dialogRef}
                id={id}
                role="dialog"
                aria-modal="true"
                aria-label="Thanh bên"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="absolute inset-y-0 left-0 flex w-sidebar max-w-full flex-col bg-canvas shadow-lg transition-transform duration-200 ease-out starting:-translate-x-full motion-reduce:transition-none"
            >
                <div className="flex h-topbar shrink-0 items-center justify-between gap-2 border-b border-border pl-4 pr-3">
                    <Brand />
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="btn btn-icon shrink-0 hover:bg-surface-tint"
                        aria-label="Đóng thanh bên"
                        title="Đóng thanh bên"
                        onClick={onClose}
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
                {groups.length > 0 && <SidebarNav groups={groups} drawer />}
            </div>
        </div>
    );
};

const Sidebar = ({ id, drawer = false, collapsed = false, onClose, returnFocusRef }) => {
    const { role } = useSession();
    const groups = Object.hasOwn(ROLE_GROUPS, role) ? ROLE_GROUPS[role] : [];

    if (drawer) return <SidebarDrawer id={id} groups={groups} onClose={onClose} returnFocusRef={returnFocusRef} />;

    return (
        <div
            id={id}
            className={cx(
                "sidebar sticky top-0 z-20 h-dvh shrink-0 gap-0 p-0",
                collapsed ? "w-sidebar-collapsed" : "w-sidebar",
            )}
        >
            <div
                className={cx(
                    "flex h-topbar shrink-0 items-center border-b border-border",
                    collapsed ? "justify-center" : "px-4",
                )}
            >
                <Brand collapsed={collapsed} />
            </div>
            {groups.length > 0 && <SidebarNav groups={groups} collapsed={collapsed} />}
        </div>
    );
};

export default Sidebar;
