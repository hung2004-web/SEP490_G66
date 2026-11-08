import { useLayoutEffect, useRef } from "react";
import { BOOKING_IDS, dayId, dayLabel, dayStatus, weekDates, weekRangeText } from "@/utils/booking";
import { cx } from "@/utils/cx";
import { formatDayMonth } from "@/utils/format";
import { BOOKING_TEXT } from "@/utils/messages";

const DAY_STYLES = {
    selected: { box: "border-primary bg-primary", label: "text-on-primary", date: "text-on-primary", status: "font-semibold text-on-primary" },
    today: { box: "border-warning bg-warning-soft", label: "font-semibold text-warning", date: "text-ink", status: "font-semibold text-success" },
    todayDisabled: { box: "border-warning bg-warning-soft", label: "font-semibold text-warning", date: "text-body", status: "font-medium text-body" },
    disabled: { box: "border-border bg-surface-tint", label: "text-placeholder", date: "text-placeholder", status: "font-medium text-body" },
    free: { box: "border-border-strong bg-canvas", label: "text-muted", date: "text-ink", status: "font-semibold text-success" },
};

const styleOf = ({ selected, isToday, enabled }) => {
    if (selected) return DAY_STYLES.selected;
    if (isToday) return enabled ? DAY_STYLES.today : DAY_STYLES.todayDisabled;
    return enabled ? DAY_STYLES.free : DAY_STYLES.disabled;
};

const BookingDayStrip = ({ weekStart, today, days, busy, error, selected, info, onSelect, onRetry }) => {
    const stripRef = useRef(null);

    useLayoutEffect(() => {
        const strip = stripRef.current;
        const target = selected ? document.getElementById(dayId(selected))?.parentElement : null;
        if (!strip || !target || strip.scrollWidth <= strip.clientWidth) return;
        strip.scrollLeft = target.offsetLeft - strip.offsetLeft - (strip.clientWidth - target.offsetWidth) / 2;
    }, [selected, weekStart, error]);

    return (
        <>
            {error ? (
                <div className="mt-3.5 rounded-md border border-border p-4">
                    <p className="text-body-sm text-muted">{BOOKING_TEXT.DAYS_ERROR}</p>
                    <button type="button" id={BOOKING_IDS.DAYS_RETRY} className="btn btn-secondary mt-2" onClick={onRetry}>
                        {BOOKING_TEXT.RETRY}
                    </button>
                </div>
            ) : (
                <div
                    ref={stripRef}
                    role="radiogroup"
                    aria-required="true"
                    aria-busy={busy || undefined}
                    aria-label={BOOKING_TEXT.DAYS_GROUP(weekRangeText(weekStart))}
                    className={cx("mt-3.5 grid grid-cols-7 gap-2 max-sm:flex max-sm:overflow-x-auto max-sm:pb-1", busy && "opacity-60")}
                >
                    {weekDates(weekStart).map((date) => {
                        const status = dayStatus(date, today, days);
                        const isToday = date === today;
                        const enabled = status.kind === "free";
                        const style = styleOf({ selected: date === selected, isToday, enabled });
                        const aria = [dayLabel(date), formatDayMonth(date), isToday && BOOKING_TEXT.TODAY_ARIA, status.text].filter(Boolean).join(", ");
                        return (
                            <label key={date} className="relative max-sm:w-21 max-sm:shrink-0">
                                <input
                                    type="radio"
                                    name="booking-day"
                                    id={dayId(date)}
                                    className="peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                    checked={date === selected}
                                    disabled={!enabled}
                                    aria-label={aria}
                                    onChange={() => onSelect(date)}
                                />
                                <span className={cx("block rounded-lg border px-1 py-2.5 text-center peer-focus-visible:shadow-focus", style.box)} aria-hidden="true">
                                    <span className={cx("block text-caption", style.label)}>{isToday ? BOOKING_TEXT.TODAY : dayLabel(date)}</span>
                                    <span className={cx("num my-0.5 block text-heading-3", style.date)}>{formatDayMonth(date)}</span>
                                    <span className={cx("block min-h-4 text-caption", style.status, status.kind === "unknown" && "skeleton")}>{status.text}</span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
            <div role="status">{info && <p className="alert alert-info mt-3">{info}</p>}</div>
        </>
    );
};

export default BookingDayStrip;
