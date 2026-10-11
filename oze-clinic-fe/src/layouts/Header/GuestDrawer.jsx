import { useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { X } from "lucide-react";
import LogoOze from "@/assets/logo/Logo-OZE-ngang.png";
import GuestSearchForm from "./GuestSearchForm.jsx";
import { GUEST_HEADER_TEXT as TEXT } from "../../utils/messages";
import { ROUTES } from "../../utils/routes";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled])";
const LINK_CLASS = "public-nav-link flex min-h-11 items-center";

const GuestDrawer = ({ id, entries, onClose, returnFocusRef }) => {
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
                <GuestSearchForm className="flex" />
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

export default GuestDrawer;
