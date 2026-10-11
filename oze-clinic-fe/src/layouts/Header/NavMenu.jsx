import { useEffect, useRef } from "react";
import { NavLink, matchPath, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cx } from "../../utils/cx";

const isCurrentPath = (to, pathname) => matchPath({ path: to, end: true }, pathname) !== null;

const getMenuItems = (list) => Array.from(list?.querySelectorAll('[role="menuitem"]') ?? []);

const focusItem = (list, target) => {
    const menuItems = getMenuItems(list);
    const item = target === "last" ? menuItems.at(-1) : menuItems[0];
    item?.focus();
};

const NavMenu = ({ id, label, items, open, onOpenChange }) => {
    const { pathname } = useLocation();
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const focusTargetRef = useRef(null);
    const active = items.some((item) => isCurrentPath(item.to, pathname));

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
        <div ref={containerRef} className="h-full">
            <button
                ref={buttonRef}
                type="button"
                className={cx(
                    "public-nav-link flex h-full cursor-pointer items-center gap-1",
                    active && "public-nav-link-active",
                )}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={open ? id : undefined}
                onClick={() => onOpenChange(!open)}
                onKeyDown={handleButtonKeyDown}
            >
                {label}
                <ChevronDown className="size-5" aria-hidden="true" />
            </button>
            {open && (
                <ul
                    ref={listRef}
                    id={id}
                    role="menu"
                    aria-label={label}
                    onKeyDown={handleMenuKeyDown}
                    className="absolute left-0 top-full z-40 max-h-80 min-w-56 overflow-y-auto rounded-md border border-border bg-canvas py-2 shadow-sm"
                >
                    {items.map((item) => (
                        <li key={item.key} role="none">
                            <NavLink
                                to={item.to}
                                end
                                role="menuitem"
                                tabIndex={-1}
                                onClick={() => onOpenChange(false)}
                                className="public-nav-link flex min-h-control items-center px-4 py-2 hover:bg-surface-tint"
                            >
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default NavMenu;
