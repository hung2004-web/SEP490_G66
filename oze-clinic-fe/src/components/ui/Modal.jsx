import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "@/utils/cx";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
const SCROLL_LOCK_CLASS = "overflow-hidden";

// Centered dialog: locks page scroll, keeps Tab inside, closes on Escape or backdrop click, returns focus on close.
// The first field (or the close button) gets focus on open; pass initialFocusRef to pick another element.
const Modal = ({ title, description, size, onClose, initialFocusRef, closeDisabled = false, children }) => {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef(null);

    useEffect(() => {
        const returnTarget = document.activeElement;
        document.body.classList.add(SCROLL_LOCK_CLASS);
        const firstField = dialogRef.current?.querySelector("input, select, textarea");
        (initialFocusRef?.current ?? firstField ?? dialogRef.current)?.focus();
        return () => {
            document.body.classList.remove(SCROLL_LOCK_CLASS);
            returnTarget?.focus?.();
        };
    }, [initialFocusRef]);

    const requestClose = () => {
        if (!closeDisabled) onClose();
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            requestClose();
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
        <div className="modal-backdrop" onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className={cx("modal", size && `modal-${size}`)}
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id={titleId} className="modal-title">
                            {title}
                        </h2>
                        {description && (
                            <p id={descriptionId} className="mt-1 text-body-sm text-muted">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="btn btn-icon -mr-2 -mt-2 shrink-0 hover:bg-surface-tint"
                        aria-label="Đóng"
                        title="Đóng"
                        disabled={closeDisabled}
                        onClick={requestClose}
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
