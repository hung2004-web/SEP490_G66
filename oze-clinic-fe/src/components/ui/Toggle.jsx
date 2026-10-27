import { useState } from "react";
import useToggle from "@/hooks/useToggle";
import { cx } from "@/utils/cx";

// On/off switch. It flips straight away; when onChange(next) returns false or throws (e.g. the API failed)
// it flips back. The parent's `checked` is only the starting value: give the Toggle a key that includes it
// (key={`${id}-${checked}`}) so a reloaded list resets it.
const Toggle = ({ checked = false, onChange, label, disabled = false, className }) => {
    const [on, toggleValue] = useToggle(checked);
    const [pending, setPending] = useState(false);

    const handleClick = async (event) => {
        event.stopPropagation();
        const next = !on;
        toggleValue(next);
        setPending(true);
        try {
            const accepted = await onChange?.(next);
            if (accepted === false) toggleValue(!next);
        } catch {
            toggleValue(!next);
        } finally {
            setPending(false);
        }
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            title={label}
            disabled={disabled || pending}
            onClick={handleClick}
            className={cx(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
                on ? "bg-primary" : "bg-border-strong",
                className,
            )}
        >
            <span
                aria-hidden="true"
                className={cx(
                    "inline-block size-5 rounded-full bg-canvas shadow-sm transition-transform duration-200",
                    on ? "translate-x-5.5" : "translate-x-0.5",
                )}
            />
        </button>
    );
};

export default Toggle;
