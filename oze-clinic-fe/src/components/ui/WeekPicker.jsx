import { ArrowLeft, ArrowRight, CalendarCheck, CalendarDays } from "lucide-react";
import { cx } from "@/utils/cx";
import { formatDate, formatDayMonth, getWeekStart, parseDateOnly, toDateOnly } from "@/utils/format";

const DAY_MS = 86_400_000;

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// ISO 8601 week number: weeks start on Monday and week 1 holds the first Thursday of the year.
const isoWeek = (date) => {
    const thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 3 - ((date.getDay() + 6) % 7)));
    const firstDay = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    return { week: Math.ceil(((thursday - firstDay) / DAY_MS + 1) / 7), year: thursday.getUTCFullYear() };
};

// Opens the browser's date picker; older browsers just focus the field.
const openPicker = (input) => {
    try {
        input.showPicker();
    } catch {
        input.focus();
    }
};

// Week chooser: a box with the week ("Tuần 45, 2026 · 02/11 – 08/11/2026") that opens a date picker (any day picks
// its week), then "Tuần trước", "Tuần hiện tại" and "Tuần sau". value: Monday of the shown week ("2026-11-02");
// onChange(monday) gets the Monday of the new week.
const WeekPicker = ({ id, value, onChange, label = "Chọn tuần", className }) => {
    const monday = parseDateOnly(value);
    const sunday = addDays(monday, 6);
    const { week, year } = isoWeek(monday);
    const isCurrent = value === getWeekStart();
    const range = `${formatDayMonth(toDateOnly(monday))} – ${formatDate(toDateOnly(sunday))}`;

    const move = (weeks) => onChange(toDateOnly(addDays(monday, weeks * 7)));

    const pick = (event) => {
        const picked = parseDateOnly(event.target.value);
        if (picked) onChange(getWeekStart(picked));
    };

    return (
        <div role="group" aria-label={label} className={cx("flex flex-wrap items-center gap-2", className)}>
            <div className="relative">
                {/* The real date field sits on top of the box, invisible, so a click opens its picker. */}
                <input
                    id={id}
                    type="date"
                    className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                    aria-label={`${label}: Tuần ${week}, ${year} (${range})`}
                    value={value}
                    onChange={pick}
                    onClick={(event) => openPicker(event.currentTarget)}
                    onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        openPicker(event.currentTarget);
                    }}
                />
                <div
                    className="input pointer-events-none flex w-auto min-w-72 items-center gap-2 peer-focus-visible:border-primary peer-focus-visible:shadow-focus"
                    aria-hidden="true"
                >
                    <span className="num flex-1 whitespace-nowrap">
                        <span className="font-semibold text-ink">{`Tuần ${week}, ${year}`}</span>
                        <span className="text-muted">{` · ${range}`}</span>
                    </span>
                    <CalendarDays className="size-4 text-muted" />
                </div>
            </div>

            <button type="button" className="btn btn-secondary" onClick={() => move(-1)}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Tuần trước
            </button>
            <button
                type="button"
                className={cx("btn", isCurrent ? "btn-primary" : "btn-secondary")}
                aria-pressed={isCurrent}
                onClick={() => onChange(getWeekStart())}
            >
                <CalendarCheck className="size-4" aria-hidden="true" />
                Tuần hiện tại
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => move(1)}>
                Tuần sau
                <ArrowRight className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
};

export default WeekPicker;
