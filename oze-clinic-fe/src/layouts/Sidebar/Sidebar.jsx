import { useEffect, useId, useRef, useState } from "react";
import { NavLink, matchPath, useLocation } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import useAsync from "@/hooks/useAsync";
import useSession from "@/hooks/useSession";
import { getPendingRequests } from "@/services/adminReportService";
import { getDoctorPendingCounts } from "@/services/doctorWorkService";
import { cx } from "@/utils/cx";
import { REQUEST_TYPES } from "@/utils/data/mockAdminReport";
import { USER_ROLES } from "@/utils/messages";
import { SIDEBAR_BADGES, getSidebarMenu } from "@/utils/sidebarMenu";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled])";
const SCROLL_LOCK_CLASS = "overflow-hidden";
// Groups the user closed, remembered per browser.
const CLOSED_GROUPS_KEY = "sidebar_closed_groups";

const readClosedGroups = () => {
    try {
        return new Set(JSON.parse(localStorage.getItem(CLOSED_GROUPS_KEY)) ?? []);
    } catch {
        return new Set();
    }
};

const saveClosedGroups = (closed) => {
    try {
        localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify([...closed]));
    } catch {
        // Storage blocked (private window): the groups just open again next time.
    }
};

// True when the page is one of the group's children (or below it, e.g. a detail page).
const containsPath = (group, pathname) => group.children.some((child) => matchPath({ path: child.to, end: false }, pathname));

// Loads the counts of one role, keyed by SIDEBAR_BADGES values. Roles without badges are left out.
const BADGE_LOADERS = {
    [USER_ROLES.CLINIC_MANAGER]: async () => {
        const result = await getPendingRequests();
        if (!result.success) return {};
        const countOf = (type) => result.data.filter((request) => request.type === type).length;
        return {
            [SIDEBAR_BADGES.PENDING_LEAVES]: countOf(REQUEST_TYPES.LEAVE),
            [SIDEBAR_BADGES.PENDING_REFUNDS]: countOf(REQUEST_TYPES.REFUND),
        };
    },
    [USER_ROLES.DOCTOR]: async () => {
        const result = await getDoctorPendingCounts();
        if (!result.success) return {};
        return {
            [SIDEBAR_BADGES.WAITING_PATIENTS]: result.data.waitingPatients,
            [SIDEBAR_BADGES.PENDING_IMAGING_REVIEWS]: result.data.pendingImagingReviews,
        };
    },
};

// Counts shown next to children with a `badge` (see SIDEBAR_BADGES).
const useSidebarBadges = (role) => {
    const { value } = useAsync(() => BADGE_LOADERS[role]?.() ?? Promise.resolve({}), [role]);
    return value ?? {};
};

// Open / closed groups. The group holding the current page opens again whenever the page changes.
const useOpenGroups = (menu) => {
    const { pathname } = useLocation();
    const activeKeys = () => menu.filter((node) => node.children && containsPath(node, pathname)).map((node) => node.key);
    const withoutActive = (closed) => new Set([...closed].filter((key) => !activeKeys().includes(key)));

    const [closed, setClosed] = useState(() => withoutActive(readClosedGroups()));
    const [seenPath, setSeenPath] = useState(pathname);
    if (seenPath !== pathname) {
        setSeenPath(pathname);
        setClosed(withoutActive(closed));
    }

    const toggle = (key) => {
        const next = new Set(closed);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setClosed(next);
        saveClosedGroups(next);
    };

    return { isOpen: (key) => !closed.has(key), toggle, pathname };
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

// Icon link: a top-level link, or a whole group when the sidebar is collapsed (active = the page is inside it).
const SidebarLink = ({ item, collapsed, drawer, active = false }) => {
    const Icon = item.icon;

    return (
        <NavLink
            to={item.to}
            className={cx(
                "sidebar-item group relative",
                active && "sidebar-item-active",
                drawer && "h-11",
                collapsed && "justify-center px-0",
            )}
        >
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

// Group head (icon, name, chevron) that opens / closes its children, which hang on a guide line.
const SidebarGroup = ({ group, open, onToggle, badges, drawer }) => {
    const listId = useId();
    const Icon = group.icon;

    return (
        <>
            <button
                type="button"
                className={cx("sidebar-item sidebar-group", drawer && "h-11")}
                aria-expanded={open}
                aria-controls={listId}
                onClick={onToggle}
            >
                <Icon aria-hidden="true" />
                <span className="flex-1 truncate text-left">{group.label}</span>
                <ChevronDown
                    className={cx("size-4 transition-transform duration-200", !open && "-rotate-90")}
                    aria-hidden="true"
                />
            </button>
            {open && (
                <ul id={listId} className="mb-1 ml-[21px] flex flex-col gap-0.5 border-l border-border pl-2">
                    {group.children.map((child) => {
                        const count = child.badge ? badges[child.badge] : 0;
                        return (
                            <li key={child.key}>
                                <NavLink to={child.to} className={cx("sidebar-subitem", drawer && "h-11")}>
                                    <span className="flex-1 truncate">{child.label}</span>
                                    {count > 0 && (
                                        <span className="sidebar-count">
                                            {count}
                                            <span className="sr-only"> đang chờ</span>
                                        </span>
                                    )}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
};

const SidebarNav = ({ menu, collapsed = false, drawer = false }) => {
    const { role } = useSession();
    const badges = useSidebarBadges(role);
    const { isOpen, toggle, pathname } = useOpenGroups(menu);

    return (
        <nav
            aria-label="Thanh bên"
            className={cx("flex min-h-0 flex-1 flex-col p-3", collapsed ? "overflow-visible" : "overflow-y-auto")}
        >
            <ul className="flex flex-col gap-1">
                {menu.map((node) => (
                    <li key={node.key}>
                        {!node.children && <SidebarLink item={node} collapsed={collapsed} drawer={drawer} />}
                        {node.children && collapsed && (
                            <SidebarLink
                                item={{ label: node.label, icon: node.icon, to: node.children[0].to }}
                                collapsed
                                active={containsPath(node, pathname)}
                            />
                        )}
                        {node.children && !collapsed && (
                            <SidebarGroup
                                group={node}
                                open={isOpen(node.key)}
                                onToggle={() => toggle(node.key)}
                                badges={badges}
                                drawer={drawer}
                            />
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
};

const SidebarDrawer = ({ id, menu, onClose, returnFocusRef }) => {
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
                {menu.length > 0 && <SidebarNav menu={menu} drawer />}
            </div>
        </div>
    );
};

const Sidebar = ({ id, drawer = false, collapsed = false, onClose, returnFocusRef }) => {
    const { role } = useSession();
    const menu = getSidebarMenu(role);

    if (drawer) return <SidebarDrawer id={id} menu={menu} onClose={onClose} returnFocusRef={returnFocusRef} />;

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
            {menu.length > 0 && <SidebarNav menu={menu} collapsed={collapsed} />}
        </div>
    );
};

export default Sidebar;
