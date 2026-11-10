import { ArrowLeft, ArrowRight, CalendarCheck, CalendarDays } from "lucide-react";
import { cx } from "@/utils/cx";
import { addDays, formatDate, formatDayMonth, getIsoWeek, getWeekStart, parseDateOnly, toDateOnly } from "@/utils/format";

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
    const { week, year } = getIsoWeek(monday);
    const isCurrent = value === getWeekStart();
    const range = `${formatDayMonth(toDateOnly(monday))} – ${formatDate(toDateOnly(sunday))}`;

    const move = (weeks) => onChange(toDateOnly(addDays(monday, weeks * 7)));

    const pick = (event) => {
        const picked = parseDateOnly(event.target.value);
        if (picked) onChange(getWeekStart(picked));
    };

    return (
        <div role="group" aria-label={label} className={cx("flex flex-wrap items-center gap-2", className)}>
            {/* Phone: the week box takes the whole first line, the three buttons share the next one. */}
            <div className="relative w-full sm:w-auto">
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
                    className="input pointer-events-none flex w-full min-w-0 items-center gap-2 peer-focus-visible:border-primary peer-focus-visible:shadow-focus sm:w-auto sm:min-w-72"
                    aria-hidden="true"
                >
                    <span className="num min-w-0 flex-1 truncate">
                        <span className="font-semibold text-ink">{`Tuần ${week}, ${year}`}</span>
                        <span className="text-muted">{` · ${range}`}</span>
                    </span>
                    <CalendarDays className="size-4 text-muted" />
                </div>
            </div>

            <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={() => move(-1)}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Tuần trước
            </button>
            <button
                type="button"
                className={cx("btn flex-1 sm:flex-none", isCurrent ? "btn-primary" : "btn-secondary")}
                aria-pressed={isCurrent}
                onClick={() => onChange(getWeekStart())}
            >
                <CalendarCheck className="size-4" aria-hidden="true" />
                Tuần hiện tại
            </button>
            <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={() => move(1)}>
                Tuần sau
                <ArrowRight className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
};

export default WeekPicker;
