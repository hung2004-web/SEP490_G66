import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Link, NavLink, matchPath, useLocation, useNavigate } from "react-router-dom";
import { Bell, BellOff, ChevronDown, ChevronLeft, ChevronRight, Info, Menu, PanelLeft, User, X } from "lucide-react";
import LogoOze from "@/assets/logo/Logo-OZE-ngang.png";
import useAsync from "@/hooks/useAsync";
import { getSessionUserName, signOut } from "@/services/authService";
import { getDentalServices } from "@/services/dentalService";
import {
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "@/services/notificationService";
import { cx } from "@/utils/cx";
import { CLINIC_HOTLINE, GUEST_HEADER_TEXT as TEXT, MESSAGES } from "@/utils/messages";
import { ROUTES, getServiceDetailRoute } from "@/utils/routes";

const HOVER_CLOSE_DELAY_MS = 150;
const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled])";
const LINK_CLASS = "public-nav-link flex min-h-11 items-center";
const ACCESS_TOKEN_KEY = "accessToken";
const DRAWER_ID = "guest-drawer";
const NAV_LINK_CLASS = "public-nav-link flex h-full items-center";
const ROW_CLASS = "flex h-full w-full items-center justify-between gap-4 px-4 md:px-6";
const ROW_START_CLASS = "flex shrink-0 items-center lg:flex-1";
const ROW_END_CLASS = "flex shrink-0 items-center justify-end lg:flex-1";
const NOTIFICATIONS_PANEL_ID = "notifications-panel";
const NOTIFICATIONS_TITLE_ID = "notifications-title";
const USER_MENU_ID = "user-menu";
const BADGE_CAP = 99;
const SKELETON_ROW_COUNT = 3;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const DAYS_PER_WEEK = 7;
const USER_MENU_ITEM_CLASS =
    "flex min-h-control w-full cursor-pointer items-center px-4 text-left text-label text-body transition-colors duration-150 hover:bg-surface-tint hover:text-ink focus-visible:bg-surface-tint";

const ABOUT_ITEMS = [
    { key: "about-us-intro", label: TEXT.ABOUT_US_INTRO, to: ROUTES.ABOUT_US },
    { key: "doctors", label: TEXT.DOCTORS, to: ROUTES.DOCTORS },
];

const preventSubmit = (event) => event.preventDefault();

const isMouse = (event) => event.pointerType === "mouse";

const isCurrentPath = (to, pathname) => matchPath({ path: to, end: true }, pathname) !== null;

const getMenuItems = (list) => Array.from(list?.querySelectorAll('[role="menuitem"]') ?? []);

const focusItem = (list, target) => {
    const menuItems = getMenuItems(list);
    const item = target === "last" ? menuItems.at(-1) : menuItems[0];
    item?.focus();
};

const subscribeToSession = (onChange) => {
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
};

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

const toServiceItems = (services) => [
    ...services.map((service) => ({
        key: `service-${service.id}`,
        label: service.name,
        to: getServiceDetailRoute(service.id),
    })),
    { key: "all-services", label: TEXT.ALL_SERVICES, to: ROUTES.SERVICES },
];

const startOfDay = (time) => new Date(time).setHours(0, 0, 0, 0);

const padDatePart = (value) => String(value).padStart(2, "0");

const formatRelativeTime = (createdAt, now) => {
    const created = Date.parse(createdAt);
    const elapsed = now - created;

    if (elapsed < MINUTE_MS) return "Vừa xong";
    if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} phút trước`;
    if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} giờ trước`;

    const days = Math.round((startOfDay(now) - startOfDay(created)) / DAY_MS);
    if (days <= 1) return "Hôm qua";
    if (days < DAYS_PER_WEEK) return `${days} ngày trước`;

    const date = new Date(created);
    return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatBadgeCount = (count) => (count > BADGE_CAP ? `${BADGE_CAP}+` : String(count));

const useDismiss = ({ open, containerRef, returnFocusRef, onDismiss }) => {
    useEffect(() => {
        if (!open) return undefined;
        const handlePointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) onDismiss();
        };
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open, containerRef, onDismiss]);

    const handleKeyDown = (event) => {
        if (!open || event.key !== "Escape") return;
        event.preventDefault();
        onDismiss();
        returnFocusRef.current?.focus();
    };

    const handleBlur = (event) => {
        if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) onDismiss();
    };

    return { onKeyDown: handleKeyDown, onBlur: handleBlur };
};

const SearchForm = ({ compact = false, className }) => {
    const inputId = useId();

    return (
        <form role="search" className={cx("items-center gap-2", className)} onSubmit={preventSubmit}>
            <label htmlFor={inputId} className="sr-only">
                {TEXT.SEARCH_LABEL}
            </label>
            <input
                id={inputId}
                type="search"
                placeholder={TEXT.SEARCH_PLACEHOLDER}
                className={cx("input min-w-0 flex-1", compact && "h-8")}
            />
            <button type="submit" className={cx("btn btn-secondary shrink-0", compact && "h-8")}>
                {TEXT.SEARCH_BUTTON}
            </button>
        </form>
    );
};

const NavMenu = ({ id, label, items, open, onOpenChange }) => {
    const { pathname } = useLocation();
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const focusTargetRef = useRef(null);
    const closeTimerRef = useRef(null);
    const hoveringRef = useRef(false);
    const active = items.some((item) => isCurrentPath(item.to, pathname));

    const clearCloseTimer = () => {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    };

    useEffect(() => () => clearTimeout(closeTimerRef.current), []);

    useEffect(() => {
        if (!open || focusTargetRef.current === null) return;
        const target = focusTargetRef.current;
        focusTargetRef.current = null;
        focusItem(listRef.current, target);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const handlePointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) onOpenChange(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open, onOpenChange]);

    const openWithFocus = (target) => {
        if (open) {
            focusItem(listRef.current, target);
            return;
        }
        focusTargetRef.current = target;
        onOpenChange(true);
    };

    const handlePointerEnter = (event) => {
        if (!isMouse(event)) return;
        hoveringRef.current = true;
        clearCloseTimer();
        onOpenChange(true);
    };

    const handlePointerLeave = (event) => {
        if (!isMouse(event)) return;
        hoveringRef.current = false;
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => onOpenChange(false), HOVER_CLOSE_DELAY_MS);
    };

    const handleButtonClick = () => onOpenChange(hoveringRef.current || !open);

    const closeToButton = () => {
        onOpenChange(false);
        buttonRef.current?.focus();
    };

    const handleButtonKeyDown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) onOpenChange(false);
            else openWithFocus("first");
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            openWithFocus("first");
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openWithFocus("last");
        } else if (event.key === "Escape" && open) {
            event.preventDefault();
            onOpenChange(false);
        }
    };

    const handleMenuKeyDown = (event) => {
        const menuItems = getMenuItems(listRef.current);
        const index = menuItems.indexOf(document.activeElement);

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                menuItems[(index + 1) % menuItems.length]?.focus();
                break;
            case "ArrowUp":
                event.preventDefault();
                menuItems[(index <= 0 ? menuItems.length : index) - 1]?.focus();
                break;
            case "Home":
                event.preventDefault();
                focusItem(listRef.current, "first");
                break;
            case "End":
                event.preventDefault();
                focusItem(listRef.current, "last");
                break;
            case "Escape":
                event.preventDefault();
                closeToButton();
                break;
            case "Tab":
                closeToButton();
                break;
            default:
                break;
        }
    };

    return (
        <div ref={containerRef} className="h-full" onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
            <button
                ref={buttonRef}
                type="button"
                className={cx(
                    "public-nav-link flex h-full cursor-pointer items-center gap-1",
                    active && "public-nav-link-active",
                )}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={id}
                onClick={handleButtonClick}
                onKeyDown={handleButtonKeyDown}
            >
                {label}
                <ChevronDown
                    className={cx("size-5 transition-transform duration-200", open && "rotate-180")}
                    aria-hidden="true"
                />
            </button>
            <ul
                ref={listRef}
                id={id}
                role="menu"
                aria-label={label}
                onKeyDown={handleMenuKeyDown}
                className={cx(
                    "absolute left-0 top-full z-40 max-h-80 min-w-56 overflow-y-auto rounded-md border border-border bg-canvas py-2 shadow-sm transition-[opacity,translate,visibility] duration-200 ease-out",
                    open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0",
                )}
            >
                {items.map((item) => (
                    <li key={item.key} role="none">
                        <NavLink
                            to={item.to}
                            end
                            role="menuitem"
                            tabIndex={-1}
                            onClick={() => onOpenChange(false)}
                            className="public-nav-link flex min-h-control items-center px-4 py-2 transition-colors duration-150 hover:bg-surface-tint"
                        >
                            {item.label}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const Drawer = ({ id, entries, onClose, returnFocusRef }) => {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);

    useEffect(() => {
        const returnTarget = returnFocusRef.current;
        closeButtonRef.current?.focus();
        return () => returnTarget?.focus();
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
        <div
            ref={dialogRef}
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label={TEXT.DRAWER_LABEL}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-canvas md:hidden"
        >
            <div className="utility-bar shrink-0">
                <div className="container-public flex items-center justify-between gap-4">
                    <Link to={ROUTES.HOME} className="shrink-0">
                        <img src={LogoOze} alt={TEXT.LOGO_ALT} className="h-5 w-auto" />
                    </Link>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="btn btn-icon text-on-primary"
                        aria-label={TEXT.CLOSE_MENU}
                        onClick={onClose}
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div className="container-public flex flex-col gap-6 py-6">
                <SearchForm className="flex" />
                <nav>
                    <ul className="flex flex-col">
                        {entries.map((entry) => (
                            <li key={entry.key}>
                                {entry.items ? (
                                    <>
                                        <p id={`${id}-${entry.key}`} className="flex min-h-11 items-center text-title text-ink">
                                            {entry.label}
                                        </p>
                                        <ul aria-labelledby={`${id}-${entry.key}`} className="flex flex-col pl-4">
                                            {entry.items.map((item) => (
                                                <li key={item.key}>
                                                    <NavLink to={item.to} end className={LINK_CLASS}>
                                                        {item.label}
                                                    </NavLink>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <NavLink to={entry.to} end={entry.end} className={LINK_CLASS}>
                                        {entry.label}
                                    </NavLink>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="flex flex-col gap-3">
                    <Link to={ROUTES.SIGN_IN} className="btn btn-primary h-11 w-full">
                        {TEXT.SIGN_IN}
                    </Link>
                    <Link to={ROUTES.REGISTER} className="btn btn-secondary h-11 w-full">
                        {TEXT.SIGN_UP}
                    </Link>
                </div>
            </div>
        </div>
    );
};

const Notifications = ({ open, onOpenChange }) => {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const requestIdRef = useRef(0);
    const { value: countResult } = useAsync(getUnreadNotificationCount, []);
    const [unreadOverride, setUnreadOverride] = useState(null);
    const [page, setPage] = useState(1);
    const [list, setList] = useState(null);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const dismissHandlers = useDismiss({
        open,
        containerRef,
        returnFocusRef: buttonRef,
        onDismiss: () => onOpenChange(false),
    });

    const unreadCount = unreadOverride ?? (countResult?.success ? countResult.data.unreadCount : 0);
    const items = list?.items ?? [];
    const totalPages = list?.totalPages ?? 1;

    const loadPage = async (nextPage) => {
        requestIdRef.current += 1;
        const requestId = requestIdRef.current;
        setPage(nextPage);
        setUnavailable(false);
        setLoading(true);

        const result = await getNotifications({ page: nextPage });
        if (requestId !== requestIdRef.current) return;

        setLoading(false);
        if (!result.success) return;
        setPage(result.data.page);
        setList({ items: result.data.items, totalPages: result.data.totalPages, now: Date.now() });
        setUnreadOverride(result.data.unreadCount);
    };

    const markAsReadInList = (shouldMark) =>
        setList(
            (current) =>
                current && {
                    ...current,
                    items: current.items.map((item) => (shouldMark(item) ? { ...item, isRead: true } : item)),
                },
        );

    const keepFocusInPanel = (trigger) => {
        if (document.activeElement === trigger) panelRef.current?.focus();
    };

    const handleBellClick = () => {
        if (open) {
            onOpenChange(false);
            return;
        }
        onOpenChange(true);
        loadPage(1);
    };

    const handlePageChange = (event, nextPage) => {
        if (nextPage <= 1 || nextPage >= totalPages) keepFocusInPanel(event.currentTarget);
        loadPage(nextPage);
    };

    const handleMarkAll = async (event) => {
        keepFocusInPanel(event.currentTarget);
        setMarkingAll(true);
        const result = await markAllNotificationsAsRead();
        setMarkingAll(false);
        if (!result.success) return;
        setUnreadOverride(result.data.unreadCount);
        markAsReadInList(() => true);
    };

    const handleSelect = async (notification) => {
        setUnavailable(false);
        const result = await markNotificationAsRead(notification.id);
        if (result.success) {
            setUnreadOverride(result.data.unreadCount);
            markAsReadInList((item) => item.id === notification.id);
        }
        if (!notification.relatedPath) {
            setUnavailable(true);
            return;
        }
        buttonRef.current?.focus();
        navigate(notification.relatedPath);
    };

    return (
        <div ref={containerRef} {...dismissHandlers}>
            <button
                ref={buttonRef}
                type="button"
                className={cx("btn btn-icon relative hover:bg-surface-tint", open && "bg-surface-tint")}
                aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"}
                title="Thông báo"
                aria-expanded={open}
                aria-controls={NOTIFICATIONS_PANEL_ID}
                onClick={handleBellClick}
            >
                <Bell className="size-5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span
                        className="num absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-caption text-on-primary ring-2 ring-canvas"
                        aria-hidden="true"
                    >
                        {formatBadgeCount(unreadCount)}
                    </span>
                )}
            </button>
            {open && (
                <div
                    ref={panelRef}
                    id={NOTIFICATIONS_PANEL_ID}
                    role="region"
                    aria-labelledby={NOTIFICATIONS_TITLE_ID}
                    aria-busy={loading}
                    tabIndex={-1}
                    className="fixed inset-x-4 top-topbar z-40 mt-1 rounded-md border border-border bg-canvas shadow-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96"
                >
                    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                        <h2 id={NOTIFICATIONS_TITLE_ID} className="text-heading-3 text-ink">
                            Thông báo
                        </h2>
                        <button
                            type="button"
                            className="btn btn-link text-label disabled:bg-transparent disabled:no-underline"
                            disabled={unreadCount === 0 || markingAll}
                            onClick={handleMarkAll}
                        >
                            Đánh dấu tất cả đã đọc
                        </button>
                    </div>
                    <div role="status">
                        {unavailable && (
                            <p className="alert alert-info mx-4 mt-3">
                                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                {MESSAGES.MSG56}
                            </p>
                        )}
                    </div>
                    {loading && (
                        <div className="flex flex-col gap-4 p-4" aria-hidden="true">
                            {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                                <div key={index} className="flex flex-col gap-2 pl-5">
                                    <div className="skeleton h-4 w-2/3" />
                                    <div className="skeleton h-3 w-full" />
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && items.length === 0 && (
                        <div className="empty-state">
                            <BellOff className="empty-state-icon" aria-hidden="true" />
                            <p className="empty-state-title">{MESSAGES.MSG55}</p>
                        </div>
                    )}
                    {!loading && items.length > 0 && (
                        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                            {items.map((notification) => (
                                <li key={notification.id}>
                                    <button
                                        type="button"
                                        className="flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-tint focus-visible:bg-surface-tint"
                                        onClick={() => handleSelect(notification)}
                                    >
                                        <span
                                            className={cx(
                                                "mt-1.5 size-2 shrink-0 rounded-full",
                                                notification.isRead ? "border border-border-strong" : "bg-primary",
                                            )}
                                            aria-hidden="true"
                                        />
                                        {!notification.isRead && <span className="sr-only">Chưa đọc</span>}
                                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="flex items-start justify-between gap-3">
                                                <span className={cx("text-label text-ink", !notification.isRead && "font-semibold")}>
                                                    {notification.title}
                                                </span>
                                                <time
                                                    dateTime={notification.createdAt}
                                                    className="num shrink-0 whitespace-nowrap text-caption text-muted"
                                                >
                                                    {formatRelativeTime(notification.createdAt, list.now)}
                                                </time>
                                            </span>
                                            <span className="line-clamp-2 text-body-sm text-body">{notification.content}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {list && totalPages > 1 && (
                        <nav
                            aria-label="Phân trang thông báo"
                            className="flex items-center justify-between gap-2 border-t border-border px-4 py-2"
                        >
                            <button
                                type="button"
                                className="btn btn-secondary btn-icon size-8"
                                aria-label="Trang trước"
                                title="Trang trước"
                                disabled={page <= 1}
                                onClick={(event) => handlePageChange(event, page - 1)}
                            >
                                <ChevronLeft className="size-4" aria-hidden="true" />
                            </button>
                            <p className="num text-label text-body" aria-live="polite">
                                Trang {page} / {totalPages}
                            </p>
                            <button
                                type="button"
                                className="btn btn-secondary btn-icon size-8"
                                aria-label="Trang sau"
                                title="Trang sau"
                                disabled={page >= totalPages}
                                onClick={(event) => handlePageChange(event, page + 1)}
                            >
                                <ChevronRight className="size-4" aria-hidden="true" />
                            </button>
                        </nav>
                    )}
                </div>
            )}
        </div>
    );
};

const UserMenu = ({ open, onOpenChange }) => {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const userName = useSyncExternalStore(subscribeToSession, getSessionUserName);
    const dismissHandlers = useDismiss({
        open,
        containerRef,
        returnFocusRef: buttonRef,
        onDismiss: () => onOpenChange(false),
    });
    const label = userName || "Tài khoản";

    const handleSignOut = () => {
        signOut();
        navigate(ROUTES.HOME);
    };

    return (
        <div ref={containerRef} {...dismissHandlers}>
            <button
                ref={buttonRef}
                type="button"
                className="btn btn-secondary gap-2 pl-1 pr-2"
                aria-expanded={open}
                aria-controls={USER_MENU_ID}
                onClick={() => onOpenChange(!open)}
            >
                <span className="avatar">
                    <User className="size-4" aria-hidden="true" />
                </span>
                <span title={label} className="hidden max-w-40 truncate text-label sm:block">
                    {label}
                </span>
                <span className="sr-only sm:hidden">{label}</span>
                <ChevronDown
                    className={cx("size-4 transition-transform duration-200", open && "rotate-180")}
                    aria-hidden="true"
                />
            </button>
            {open && (
                <div
                    id={USER_MENU_ID}
                    className="absolute right-0 top-full z-40 mt-1 w-56 rounded-md border border-border bg-canvas py-1 shadow-sm"
                >
                    <ul>
                        <li>
                            <Link to={ROUTES.PROFILE} className={USER_MENU_ITEM_CLASS}>
                                Hồ sơ cá nhân
                            </Link>
                        </li>
                        <li>
                            <Link to={ROUTES.CHANGE_PASSWORD} className={USER_MENU_ITEM_CLASS}>
                                Đổi mật khẩu
                            </Link>
                        </li>
                    </ul>
                    <hr className="my-1 border-border" />
                    <button type="button" className={USER_MENU_ITEM_CLASS} onClick={handleSignOut}>
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    );
};

const TopBar = ({ onToggleSidebar, sidebarOpen }) => {
    const location = useLocation();
    const [openPanel, setOpenPanel] = useState(null);
    const openPanelId = openPanel?.key === location.key ? openPanel.id : null;

    const setPanelOpen = (panelId) => (nextOpen) =>
        setOpenPanel((current) => {
            if (nextOpen) return { id: panelId, key: location.key };
            return current?.id === panelId ? null : current;
        });

    return (
        <header className="topbar">
            {onToggleSidebar && (
                <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    aria-label="Ẩn hoặc hiện thanh bên"
                    title="Ẩn hoặc hiện thanh bên"
                    aria-expanded={sidebarOpen}
                    onClick={onToggleSidebar}
                >
                    <PanelLeft className="size-5" aria-hidden="true" />
                </button>
            )}
            <div className="relative ml-auto flex h-full items-center gap-2">
                <Notifications
                    open={openPanelId === NOTIFICATIONS_PANEL_ID}
                    onOpenChange={setPanelOpen(NOTIFICATIONS_PANEL_ID)}
                />
                <UserMenu open={openPanelId === USER_MENU_ID} onOpenChange={setPanelOpen(USER_MENU_ID)} />
            </div>
        </header>
    );
};

const Header = ({ onToggleSidebar, sidebarOpen }) => {
    const location = useLocation();
    const accessToken = useSyncExternalStore(subscribeToSession, getAccessToken);
    const { value: servicesResult } = useAsync(getDentalServices, []);
    const [openMenu, setOpenMenu] = useState(null);
    const [drawerKey, setDrawerKey] = useState(null);
    const menuButtonRef = useRef(null);

    const serviceItems = toServiceItems(servicesResult?.success ? servicesResult.data : []);
    const openMenuId = openMenu?.key === location.key ? openMenu.id : null;
    const drawerOpen = drawerKey === location.key;

    const navEntries = [
        { key: "home", label: TEXT.HOME, to: ROUTES.HOME, end: true },
        { key: "services", label: TEXT.SERVICES, items: serviceItems },
        { key: "book-appointment", label: TEXT.BOOK_APPOINTMENT, to: ROUTES.BOOK_APPOINTMENT },
        { key: "about-us", label: TEXT.ABOUT_US, items: ABOUT_ITEMS },
        { key: "contact", label: TEXT.CONTACT, to: ROUTES.CONTACT },
    ];

    const setMenuOpen = (menuId) => (nextOpen) =>
        setOpenMenu((current) => {
            if (nextOpen) return { id: menuId, key: location.key };
            return current?.id === menuId ? null : current;
        });

    if (accessToken) return <TopBar onToggleSidebar={onToggleSidebar} sidebarOpen={sidebarOpen} />;

    return (
        <>
            <header className="utility-bar">
                <div className={ROW_CLASS}>
                    <div className={ROW_START_CLASS}>
                        <Link to={ROUTES.HOME} className="shrink-0">
                            <img src={LogoOze} alt={TEXT.LOGO_ALT} className="h-5 w-auto md:h-9" />
                        </Link>
                    </div>
                    <div className="hidden min-w-0 flex-1 justify-center md:flex lg:w-md lg:flex-none">
                        <SearchForm compact className="flex w-full max-w-md" />
                    </div>
                    <div className={`${ROW_END_CLASS} gap-4`}>
                        <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="whitespace-nowrap text-on-primary">
                            {TEXT.HOTLINE_LABEL} <span className="num font-semibold underline">{CLINIC_HOTLINE.DISPLAY}</span>
                        </a>
                        <button
                            ref={menuButtonRef}
                            type="button"
                            className="btn btn-icon text-on-primary md:hidden"
                            aria-label={TEXT.OPEN_MENU}
                            aria-haspopup="dialog"
                            aria-expanded={drawerOpen}
                            aria-controls={DRAWER_ID}
                            onClick={() => setDrawerKey(location.key)}
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </header>
            <nav className="public-nav hidden md:flex">
                <div className={ROW_CLASS}>
                    <div className="hidden lg:block lg:flex-1" />
                    <ul className="flex h-full min-w-0 flex-1 items-center justify-center gap-6 lg:flex-none lg:gap-8">
                        {navEntries.map((entry) =>
                            entry.items ? (
                                <li key={entry.key} className="relative h-full">
                                    <NavMenu
                                        id={`${entry.key}-menu`}
                                        label={entry.label}
                                        items={entry.items}
                                        open={openMenuId === entry.key}
                                        onOpenChange={setMenuOpen(entry.key)}
                                    />
                                </li>
                            ) : (
                                <li key={entry.key} className="h-full">
                                    <NavLink to={entry.to} end={entry.end} className={NAV_LINK_CLASS}>
                                        {entry.label}
                                    </NavLink>
                                </li>
                            ),
                        )}
                    </ul>
                    <div className={`${ROW_END_CLASS} gap-3`}>
                        <Link to={ROUTES.SIGN_IN} className="btn btn-primary">
                            {TEXT.SIGN_IN}
                        </Link>
                        <Link to={ROUTES.REGISTER} className="btn btn-secondary">
                            {TEXT.SIGN_UP}
                        </Link>
                    </div>
                </div>
            </nav>
            {drawerOpen && (
                <Drawer
                    id={DRAWER_ID}
                    entries={navEntries}
                    onClose={() => setDrawerKey(null)}
                    returnFocusRef={menuButtonRef}
                />
            )}
        </>
    );
};

export default Header;
