import { useRef, useState, useSyncExternalStore } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import LogoOze from "@/assets/logo/Logo-OZE-ngang.png";
import useAsync from "../../hooks/useAsync";
import { getDentalServices } from "../../services/dentalService";
import GuestDrawer from "./GuestDrawer.jsx";
import GuestSearchForm from "./GuestSearchForm.jsx";
import NavMenu from "./NavMenu.jsx";
import { CLINIC_HOTLINE, GUEST_HEADER_TEXT as TEXT } from "../../utils/messages";
import { ROUTES, getServiceDetailRoute } from "../../utils/routes";

const ACCESS_TOKEN_KEY = "accessToken";
const DRAWER_ID = "guest-drawer";
const NAV_LINK_CLASS = "public-nav-link flex h-full items-center";

const ABOUT_ITEMS = [
    { key: "about-us-intro", label: TEXT.ABOUT_US_INTRO, to: ROUTES.ABOUT_US },
    { key: "doctors", label: TEXT.DOCTORS, to: ROUTES.DOCTORS },
];

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

const GuestHeader = () => {
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
                <div className="container-public flex items-center justify-between gap-4">
                    <Link to={ROUTES.HOME} className="shrink-0">
                        <img src={LogoOze} alt={TEXT.LOGO_ALT} className="h-5 w-auto md:h-6" />
                    </Link>
                    <GuestSearchForm compact className="hidden max-w-md flex-1 md:flex" />
                    <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="shrink-0 whitespace-nowrap text-on-primary">
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
            </header>
            <nav className="public-nav hidden md:flex">
                <div className="container-public flex h-full items-center justify-between gap-6">
                    <ul className="flex h-full items-center gap-6 lg:gap-8">
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
                    <div className="flex items-center gap-3">
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
                <GuestDrawer
                    id={DRAWER_ID}
                    entries={navEntries}
                    onClose={() => setDrawerKey(null)}
                    returnFocusRef={menuButtonRef}
                />
            )}
        </>
    );
};

export default GuestHeader;
