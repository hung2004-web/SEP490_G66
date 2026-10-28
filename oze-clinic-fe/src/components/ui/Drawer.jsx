import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
const SCROLL_LOCK_CLASS = "overflow-hidden";

// Panel sliding in from the right, for details that keep the list behind in view.
// Same behaviour as Modal: locks page scroll, keeps Tab inside, closes on Escape or backdrop click, returns focus on close.
// eyebrow: small line above the title; badge: shown next to the title.
const Drawer = ({ title, eyebrow, badge, onClose, children }) => {
    const titleId = useId();
    const drawerRef = useRef(null);

    useEffect(() => {
        const returnTarget = document.activeElement;
        const alreadyLocked = document.body.classList.contains(SCROLL_LOCK_CLASS);
        document.body.classList.add(SCROLL_LOCK_CLASS);
        drawerRef.current?.focus();
        return () => {
            if (!alreadyLocked) document.body.classList.remove(SCROLL_LOCK_CLASS);
            returnTarget?.focus?.();
        };
    }, []);

    const handleKeyDown = (event) => {
        // Already handled by a Modal opened inside the drawer.
        if (event.defaultPrevented) return;
        if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
        }
        if (event.key !== "Tab") return;

        const focusables = Array.from(drawerRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
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
        <div className="drawer-backdrop" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
            <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="drawer outline-none"
            >
                <div className="drawer-header">
                    <div className="min-w-0">
                        {eyebrow && <p className="text-caption text-muted">{eyebrow}</p>}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <h2 id={titleId} className="modal-title">
                                {title}
                            </h2>
                            {badge}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-icon -mr-2 shrink-0 hover:bg-surface-tint"
                        aria-label="Đóng"
                        title="Đóng"
                        onClick={onClose}
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="drawer-body">{children}</div>
            </div>
        </div>
    );
};

export default Drawer;
