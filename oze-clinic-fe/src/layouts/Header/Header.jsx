import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Link, NavLink, matchPath, useLocation } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import LogoOze from "@/assets/logo/Logo-OZE-ngang.png";
import useAsync from "@/hooks/useAsync";
import { getDentalServices } from "@/services/dentalService";
import { cx } from "@/utils/cx";
import { CLINIC_HOTLINE, GUEST_HEADER_TEXT as TEXT } from "@/utils/messages";
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

const Header = () => {
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

    if (accessToken) return null;

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
