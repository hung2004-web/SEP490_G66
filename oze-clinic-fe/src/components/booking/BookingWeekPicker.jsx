import { useEffect, useRef } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays } from "lucide-react";
import { BOOKING_IDS, calendarWeeks, monthHasUsableWeek, shiftMonth, weekAriaText, weekRangeText, weekRowId, weekText } from "@/utils/booking";
import { cx } from "@/utils/cx";
import { BOOKING_TEXT } from "@/utils/messages";

const { WEEK_BUTTON: WEEK_BUTTON_ID, PREV_WEEK: PREV_WEEK_ID, THIS_WEEK: THIS_WEEK_ID, NEXT_WEEK: NEXT_WEEK_ID, MONTH_UP: MONTH_UP_ID, MONTH_DOWN: MONTH_DOWN_ID } = BOOKING_IDS;

const MONTH_BUTTON = "grid size-10 cursor-pointer place-items-center rounded-md text-ink hover:bg-surface-tint disabled:cursor-not-allowed disabled:text-placeholder disabled:hover:bg-transparent";

const rowAria = (week) =>
    `${BOOKING_TEXT.WEEK_ROW(week.week, weekRangeText(week.weekStart, true))}${week.hasToday ? BOOKING_TEXT.WEEK_ROW_TODAY : ""}${week.usable ? "" : BOOKING_TEXT.WEEK_ROW_OUTSIDE}`;

const dayClass = (day, current) => {
    if (current) return "";
    if (day.isToday) return "font-bold text-warning underline";
    return day.otherMonth ? "text-muted" : "";
};

const Calendar = ({ weekStart, bounds, today, month, onMonth, onWeek }) => {
    const weeks = calendarWeeks(month, bounds, today);
    const canUp = monthHasUsableWeek(shiftMonth(month, -1), bounds, today);
    const canDown = monthHasUsableWeek(shiftMonth(month, 1), bounds, today);
    return (
        <div role="dialog" aria-label={BOOKING_TEXT.PICK_WEEK} className="absolute top-full left-0 z-20 mt-1.5 w-80 rounded-lg border border-border bg-canvas p-3 shadow-lg max-sm:w-full">
            <div className="mb-1.5 flex items-center gap-1">
                <p className="flex-1 font-semibold text-ink" aria-live="polite">
                    {BOOKING_TEXT.MONTH_TITLE(month.month + 1, month.year)}
                </p>
                <button type="button" id={MONTH_UP_ID} className={MONTH_BUTTON} aria-label={BOOKING_TEXT.PREV_MONTH} disabled={!canUp} onClick={() => onMonth(-1)}>
                    <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button type="button" id={MONTH_DOWN_ID} className={MONTH_BUTTON} aria-label={BOOKING_TEXT.NEXT_MONTH} disabled={!canDown} onClick={() => onMonth(1)}>
                    <ArrowDown className="size-4" aria-hidden="true" />
                </button>
            </div>
            <div className="grid grid-cols-8 text-center text-body-sm" aria-hidden="true">
                {[BOOKING_TEXT.WEEK_COLUMN, ...BOOKING_TEXT.WEEKDAY_SHORT].map((label) => (
                    <span key={label} className="py-1 font-medium text-muted">
                        {label}
                    </span>
                ))}
            </div>
            <ul>
                {weeks.map((week) => {
                    const current = week.weekStart === weekStart;
                    return (
                        <li key={week.weekStart}>
                            <button
                                type="button"
                                id={weekRowId(week.weekStart)}
                                className={cx(
                                    "grid w-full cursor-pointer grid-cols-8 rounded-md text-center text-body-sm disabled:cursor-not-allowed disabled:text-placeholder",
                                    current ? "bg-primary text-on-primary" : "text-ink enabled:hover:bg-primary-soft"
                                )}
                                aria-current={current}
                                aria-label={rowAria(week)}
                                disabled={!week.usable}
                                onClick={() => onWeek(week.weekStart)}
                            >
                                <span className={cx("num border-r border-border py-2", current ? "font-bold" : "text-muted")}>{week.week}</span>
                                {week.days.map((day) => (
                                    <span key={day.date} className={cx("num py-2", week.usable && dayClass(day, current))}>
                                        {day.day}
                                    </span>
                                ))}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <div className="mt-1.5 flex justify-end">
                <button type="button" className="h-control cursor-pointer px-2 font-medium text-primary" onClick={() => onWeek(bounds.first)}>
                    {BOOKING_TEXT.THIS_WEEK}
                </button>
            </div>
        </div>
    );
};

const BookingWeekPicker = ({ weekStart, bounds, today, calendar, onToggle, onMonth, onWeek, onClose, onPrev, onThisWeek, onNext }) => {
    const boxRef = useRef(null);
    const open = calendar.open;

    useEffect(() => {
        if (!open) return undefined;
        const closeOutside = (event) => {
            if (!boxRef.current?.contains(event.target)) onClose(false);
        };
        document.addEventListener("mousedown", closeOutside);
        return () => document.removeEventListener("mousedown", closeOutside);
    }, [open, onClose]);

    const handleBlur = (event) => {
        if (open && event.relatedTarget && !boxRef.current?.contains(event.relatedTarget)) onClose(false);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape" && open) {
            event.stopPropagation();
            onClose(true);
        }
    };

    return (
        <>
            <span id="booking-day-label" className="mt-7 mb-2.5 block font-heading text-heading-3 text-ink">
                {BOOKING_TEXT.DAY}
                <span className="text-danger" aria-hidden="true">
                    {" *"}
                </span>
            </span>
            <div className="flex flex-wrap items-start gap-2.5">
                <div ref={boxRef} className="relative max-w-100 flex-1 basis-65 max-sm:max-w-none max-sm:basis-full" onBlur={handleBlur} onKeyDown={handleKeyDown}>
                    <button
                        type="button"
                        id={WEEK_BUTTON_ID}
                        className="input flex cursor-pointer items-center justify-between aria-expanded:border-primary"
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-label={weekAriaText(weekStart)}
                        onClick={onToggle}
                    >
                        <span>{weekText(weekStart)}</span>
                        <CalendarDays className="size-4.5" aria-hidden="true" />
                    </button>
                    {open && <Calendar weekStart={weekStart} bounds={bounds} today={today} month={calendar.month} onMonth={onMonth} onWeek={onWeek} />}
                </div>
                <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:gap-1.5 max-sm:*:min-w-0 max-sm:*:flex-1 max-sm:*:basis-20 max-sm:*:gap-1 max-sm:*:px-1">
                    <button type="button" id={PREV_WEEK_ID} className="btn btn-secondary" disabled={weekStart <= bounds.first} onClick={onPrev}>
                        <ArrowLeft className="size-4 max-sm:hidden" aria-hidden="true" />
                        {BOOKING_TEXT.PREV_WEEK}
                    </button>
                    <button type="button" id={THIS_WEEK_ID} className="btn btn-secondary" onClick={onThisWeek}>
                        <CalendarDays className="size-4 max-sm:hidden" aria-hidden="true" />
                        {BOOKING_TEXT.THIS_WEEK}
                    </button>
                    <button type="button" id={NEXT_WEEK_ID} className="btn btn-secondary" disabled={weekStart >= bounds.last} onClick={onNext}>
                        {BOOKING_TEXT.NEXT_WEEK}
                        <ArrowRight className="size-4 max-sm:hidden" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </>
    );
};

export default BookingWeekPicker;
