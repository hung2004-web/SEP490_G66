import { useId } from "react";
import { cx } from "@/utils/cx";

// Time slots of the follow-up date as a radio group. Full slots stay visible ("Hết chỗ") but cannot be picked.
// slots: [{ start: "09:00", end: "09:30", full? }]. value: start of the picked slot. busy: slots are loading.
const FollowUpSlotPicker = ({ slots = [], value, busy = false, disabled = false, error, errorId, onChange }) => {
    const name = useId();

    let body;
    if (busy) {
        body = (
            <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
                {[0, 1, 2, 3].map((key) => (
                    <div key={key} className="skeleton h-11" />
                ))}
            </div>
        );
    } else if (slots.length === 0) {
        body = <p className="text-body-sm text-muted">Chọn ngày hẹn để xem khung giờ còn trống.</p>;
    } else {
        body = (
            <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
                {slots.map((slot) => {
                    const checked = slot.start === value;
                    const unavailable = disabled || slot.full;
                    return (
                        <label key={slot.start} className={cx("relative", unavailable ? "cursor-not-allowed" : "cursor-pointer")}>
                            <input
                                type="radio"
                                name={name}
                                className="peer absolute inset-0 m-0 cursor-[inherit] opacity-0"
                                checked={checked}
                                disabled={unavailable}
                                aria-describedby={error ? errorId : undefined}
                                aria-label={`${slot.start} – ${slot.end}${slot.full ? ", hết chỗ" : ""}`}
                                onChange={() => onChange(slot.start)}
                            />
                            <span
                                aria-hidden="true"
                                className={cx(
                                    "num flex min-h-11 flex-col items-center justify-center rounded-md border px-1 py-1 text-center text-body-sm whitespace-nowrap peer-focus-visible:shadow-focus",
                                    slot.full
                                        ? "border-transparent bg-surface-muted font-medium text-placeholder"
                                        : checked
                                          ? "border-[1.5px] border-primary bg-primary-soft font-semibold text-primary"
                                          : "border-border-strong bg-canvas font-medium text-ink"
                                )}
                            >
                                {slot.start} – {slot.end}
                                {slot.full && <span className="text-caption font-medium">Hết chỗ</span>}
                            </span>
                        </label>
                    );
                })}
            </div>
        );
    }

    return (
        <fieldset className="flex min-w-0 flex-col gap-1.5 @container" aria-busy={busy || undefined}>
            <legend className="sr-only">
                Khung giờ hẹn
            </legend>
            {body}
            {error && (
                <p id={errorId} className="error-text">
                    {error}
                </p>
            )}
        </fieldset>
    );
};

export default FollowUpSlotPicker;
