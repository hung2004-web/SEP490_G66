import { BOOKING_IDS, NOON, slotId, slotRange } from "@/utils/booking";
import { cx } from "@/utils/cx";
import { formatTime } from "@/utils/format";
import { BOOKING_TEXT } from "@/utils/messages";

const WARNING_ID = "booking-slot-warning";
const ERROR_ID = "booking-slot-error";

const SESSIONS = [
    { label: BOOKING_TEXT.MORNING, test: (slot) => slot.slotStart < NOON },
    { label: BOOKING_TEXT.AFTERNOON, test: (slot) => slot.slotStart >= NOON },
];

const Session = ({ label, slots, selected, describedBy, onSelect }) => (
    <>
        <p className="mt-4 mb-2 text-label text-body">
            {label} <span className="font-normal text-muted">{BOOKING_TEXT.SESSION_COUNT(slots.length)}</span>
        </p>
        {slots.length ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                {slots.map((slot) => {
                    const checked = slot.slotStart === selected;
                    return (
                        <label key={slot.slotStart} className="relative">
                            <input
                                type="radio"
                                name="booking-slot"
                                id={slotId(slot.slotStart)}
                                className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                                checked={checked}
                                aria-describedby={describedBy}
                                aria-label={BOOKING_TEXT.SLOT_ARIA(formatTime(slot.slotStart), formatTime(slot.slotEnd))}
                                onChange={() => onSelect(slot.slotStart)}
                            />
                            <span
                                className={cx(
                                    "num flex min-h-control items-center justify-center rounded-md border px-1 py-2 text-center text-body-sm whitespace-nowrap peer-focus-visible:shadow-focus",
                                    checked ? "border-primary bg-primary font-semibold text-on-primary" : "border-border-strong bg-canvas font-medium text-ink"
                                )}
                                aria-hidden="true"
                            >
                                {slotRange(slot.slotStart, slot.slotEnd)}
                            </span>
                        </label>
                    );
                })}
            </div>
        ) : (
            <p className="py-1 text-body-sm text-muted">{BOOKING_TEXT.SESSION_EMPTY(label)}</p>
        )}
    </>
);

const BookingSlotGrid = ({ slots, busy, error, selected, warning, warningLive, slotError, onSelect, onRetry }) => {
    const renderBody = () => {
        if (busy) {
            return (
                <div className="mt-3 flex flex-col gap-2.5">
                    <div className="skeleton h-11" />
                    <div className="skeleton h-11" />
                </div>
            );
        }
        if (error) {
            return (
                <>
                    <p className="mt-3 text-body-sm text-muted">{BOOKING_TEXT.SLOTS_ERROR}</p>
                    <button type="button" id={BOOKING_IDS.SLOTS_RETRY} className="btn btn-secondary mt-2" onClick={onRetry}>
                        {BOOKING_TEXT.RETRY}
                    </button>
                </>
            );
        }
        return SESSIONS.map((session) => (
            <Session key={session.label} label={session.label} slots={(slots ?? []).filter(session.test)} selected={selected} describedBy={slotError ? ERROR_ID : undefined} onSelect={onSelect} />
        ));
    };

    return (
        <fieldset id={BOOKING_IDS.SLOTS} tabIndex={-1} className="mt-7 min-w-0" aria-required="true" aria-busy={busy || undefined} aria-describedby={`${WARNING_ID} ${ERROR_ID}`}>
            <legend className="font-heading text-heading-3 text-ink">
                {BOOKING_TEXT.SLOT}
                <span className="text-danger" aria-hidden="true">
                    {" *"}
                </span>
            </legend>
            <div id={WARNING_ID} role={warningLive ? "alert" : undefined}>
                {warning && <p className="alert alert-warning mt-3">{warning}</p>}
            </div>
            {renderBody()}
            <p id={ERROR_ID} className="mt-2 text-body-sm font-medium text-danger empty:hidden">
                {slotError}
            </p>
        </fieldset>
    );
};

export default BookingSlotGrid;
