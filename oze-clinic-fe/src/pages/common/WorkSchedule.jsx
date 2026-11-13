import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Modal from "@/components/ui/Modal";
import MyShiftBar from "@/components/staff/MyShiftBar";
import { Card, ErrorLine, PageHeader } from "@/components/reception/shared";
import { clinicClock, report } from "@/components/reception/receptionUtils";
import {
    LEAVE_SLOTS,
    LEAVE_STATUS,
    cancelLeaveRequest,
    createLeaveRequest,
    getMyLeaveRequests,
    getMyShifts,
    leaveSlotText,
    slotOfShift,
} from "@/services/myScheduleService";
import { clinicToday } from "@/services/receptionService";
import { cx } from "@/utils/cx";

// "Lịch làm việc" for doctors, receptionists and imaging technicians, laid out like the receptionist's "Quản lý lịch hẹn":
// the week as a time grid (one row per half hour, one column per day) with each of my shifts as a block over its hours.
// Click a shift for its details and to ask for leave; leave is approved by the manager.

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const ROW_MINUTES = 30;

const hhmm = (time) => time?.slice(0, 5) ?? "";
const ddmm = (date) => date.split("-").reverse().slice(0, 2).join("/");
const dmy = (date) => date.split("-").reverse().join("/");
const addDays = (date, days) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const mondayOf = (date) => {
    const [y, m, d] = date.split("-").map(Number);
    return addDays(date, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
};
const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const fromMinutes = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const floorRow = (minutes) => Math.floor(minutes / ROW_MINUTES) * ROW_MINUTES;
const ceilRow = (minutes) => Math.ceil(minutes / ROW_MINUTES) * ROW_MINUTES;

// Clinic "now" as yyyy-mm-ddTHH:mm, comparable with a shift's date and start time
const nowClinic = () => `${clinicToday()}T${clinicClock()}`;

// Look of a shift: working, leave asked (waiting for the manager), or off (leave approved / marked absent)
const TONES = {
    work: { label: "Ca làm", block: "border-primary/30 bg-primary-soft text-primary", dot: "bg-primary" },
    pending: { label: "Chờ duyệt nghỉ", block: "border-dashed border-warning bg-warning-soft text-warning", dot: "bg-warning-solid" },
    off: { label: "Nghỉ", block: "border-border bg-surface-muted text-muted", dot: "bg-border-strong" },
};

// The shifts of one day merged into blocks: overlapping shifts share one block.
const blocksOfDay = (dayShifts) => {
    const blocks = [];
    [...dayShifts]
        .sort((a, b) => a.shiftStart.localeCompare(b.shiftStart))
        .forEach((shift) => {
            const start = floorRow(toMinutes(shift.shiftStart));
            const end = Math.max(ceilRow(toMinutes(shift.shiftEnd)), start + ROW_MINUTES);
            const last = blocks.at(-1);
            if (last && start < last.end) {
                last.end = Math.max(last.end, end);
                last.shifts.push(shift);
            } else {
                blocks.push({ start, end, shifts: [shift] });
            }
        });
    return blocks;
};

const WorkSchedule = () => {
    const today = clinicToday();
    const [weekStart, setWeekStart] = useState(() => mondayOf(today));
    const [state, setState] = useState({ loading: true, shifts: [], leaves: [], error: null });
    const [version, setVersion] = useState(0);
    const [opened, setOpened] = useState(null);
    const [asking, setAsking] = useState(null);

    // Two weeks at a time: the week shown and the next one, so "Xin nghỉ" can offer days ahead
    useEffect(() => {
        let active = true;
        Promise.all([getMyShifts({ fromDate: weekStart, toDate: addDays(weekStart, 13) }), getMyLeaveRequests()]).then(([shiftResult, leaveResult]) => {
            if (!active) return;
            setState({
                loading: false,
                shifts: shiftResult.success ? shiftResult.data : [],
                leaves: leaveResult.success ? leaveResult.data.items : [],
                error: shiftResult.success ? null : shiftResult.message,
            });
        });
        return () => {
            active = false;
        };
    }, [weekStart, version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const { shifts, leaves } = state;
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const weekShifts = useMemo(() => shifts.filter((shift) => shift.scheduleDate >= days[0] && shift.scheduleDate <= days[6]), [shifts, days]);

    // Pending or approved leave that covers the shift
    const leaveOf = (shift) =>
        leaves.find(
            (leave) =>
                leave.leaveDate === shift.scheduleDate &&
                ["Pending", "Approved"].includes(leave.status) &&
                (!leave.slot || leave.slot === slotOfShift(shift.shiftStart)),
        );
    const toneOf = (shift) => {
        const leave = leaveOf(shift);
        if (leave?.status === "Pending") return TONES.pending;
        if (leave || shift.isPresent === false) return TONES.off;
        return TONES.work;
    };

    // Future shifts without leave yet can still be asked off
    const leaveable = shifts.filter((shift) => `${shift.scheduleDate}T${hhmm(shift.shiftStart)}` > nowClinic() && !leaveOf(shift));

    // Rows from 08:00 to 17:30, widened to any shift outside that
    const rows = useMemo(() => {
        const first = Math.min(8 * 60, ...weekShifts.map((shift) => floorRow(toMinutes(shift.shiftStart))));
        const last = Math.max(17 * 60 + 30, ...weekShifts.map((shift) => ceilRow(toMinutes(shift.shiftEnd)) - ROW_MINUTES));
        return Array.from({ length: (last - first) / ROW_MINUTES + 1 }, (_, i) => first + i * ROW_MINUTES);
    }, [weekShifts]);

    const blocksByDay = useMemo(
        () => Object.fromEntries(days.map((day) => [day, blocksOfDay(weekShifts.filter((shift) => shift.scheduleDate === day))])),
        [days, weekShifts],
    );

    const isPast = (day, row) => day < today || (day === today && fromMinutes(row) < clinicClock());

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Lịch làm việc" description="Ca được quản lý phân. Bấm một ca để xem chi tiết; muốn nghỉ ca nào thì gửi đơn, quản lý duyệt rồi mới được nghỉ.">
                <button type="button" className="btn btn-primary" disabled={leaveable.length === 0} onClick={() => setAsking({ shifts: leaveable })}>
                    <CalendarOff className="size-4" aria-hidden /> Xin nghỉ
                </button>
            </PageHeader>

            <MyShiftBar onChange={reload} />
            <ErrorLine message={state.error} />

            <Card>
                <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                    <button type="button" className="btn btn-secondary btn-icon" aria-label="Tuần trước" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                        <ChevronLeft className="size-4" aria-hidden />
                    </button>
                    <p className="num min-w-40 text-center text-label text-ink">
                        {ddmm(weekStart)} – {ddmm(addDays(weekStart, 6))}
                    </p>
                    <button type="button" className="btn btn-secondary btn-icon" aria-label="Tuần sau" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                        <ChevronRight className="size-4" aria-hidden />
                    </button>
                    {weekStart !== mondayOf(today) && (
                        <button type="button" className="btn btn-link" onClick={() => setWeekStart(mondayOf(today))}>
                            Tuần này
                        </button>
                    )}
                    <span className="flex-1" />
                    <p className="num text-caption text-muted">{weekShifts.length} ca trong tuần</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-5 py-2 text-caption text-muted">
                    {Object.values(TONES).map((tone) => (
                        <span key={tone.label} className="inline-flex items-center gap-1.5">
                            <i aria-hidden className={cx("size-2 rounded-full", tone.dot)} />
                            {tone.label}
                        </span>
                    ))}
                </div>

                <div className={cx("overflow-x-auto border-t border-border", state.loading && "opacity-60")}>
                    <table className="w-full min-w-[820px] table-fixed border-collapse text-caption">
                        <thead>
                            <tr className="bg-surface-muted">
                                <th className="w-16 px-2 py-2 text-left font-medium text-muted">Giờ</th>
                                {days.map((day, i) => (
                                    <th key={day} className={cx("border-l border-border px-2 py-2 font-medium", day === today ? "bg-primary-soft text-primary" : "text-muted")}>
                                        {WEEKDAYS[i]} <span className="num font-semibold text-ink">{ddmm(day)}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row} className="border-t border-border">
                                    <th scope="row" className="num px-2 py-1 text-left align-top font-medium text-muted">
                                        {fromMinutes(row)}
                                    </th>
                                    {days.map((day) => {
                                        const blocks = blocksByDay[day];
                                        // Rows inside a block are covered by the block's cell (rowSpan)
                                        if (blocks.some((block) => row > block.start && row < block.end)) return null;
                                        const block = blocks.find((item) => item.start === row);
                                        const base = cx("border-l border-border p-0.5 align-top", day === today && "bg-primary-softer", !block && isPast(day, row) && "bg-surface-muted/50");
                                        if (!block) return <td key={day} className={cx("h-12", base)} />;
                                        return (
                                            <td key={day} rowSpan={(block.end - block.start) / ROW_MINUTES} className={base}>
                                                <div className="flex h-full flex-col gap-0.5">
                                                    {block.shifts.map((shift) => {
                                                        const tone = toneOf(shift);
                                                        return (
                                                            <button
                                                                key={shift.id}
                                                                type="button"
                                                                onClick={() => setOpened(shift)}
                                                                className={cx(
                                                                    "flex min-h-11 w-full flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-md border px-1.5 py-1 text-left outline-none transition-shadow hover:shadow-md focus-visible:shadow-focus",
                                                                    tone.block,
                                                                )}
                                                                aria-label={`Ca ${ddmm(day)} ${hhmm(shift.shiftStart)}–${hhmm(shift.shiftEnd)}: ${tone.label}`}
                                                            >
                                                                <span className={cx("num font-semibold", tone === TONES.off && "line-through")}>
                                                                    {hhmm(shift.shiftStart)}–{hhmm(shift.shiftEnd)}
                                                                </span>
                                                                <span className="w-full truncate">{shift.roomName ?? shift.assignment ?? "Chưa gán phòng"}</span>
                                                                {tone !== TONES.work && <span className="font-semibold">{tone.label}</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!state.loading && weekShifts.length === 0 && <p className="border-t border-border px-5 py-4 text-center text-body-sm text-muted">Tuần này bạn chưa được phân ca nào.</p>}
            </Card>

            <section aria-labelledby="my-leaves-title" className="mt-6 rounded-xl border border-border bg-canvas">
                <h2 id="my-leaves-title" className="border-b border-border px-5 py-3 text-label text-ink">
                    Đơn xin nghỉ của tôi
                </h2>
                {leaves.length === 0 ? (
                    <p className="px-5 py-6 text-body-sm text-muted">Bạn chưa gửi đơn nào.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {leaves.map((leave) => (
                            <li key={leave.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-body-sm">
                                <span className="num min-w-24 font-semibold text-ink">{dmy(leave.leaveDate)}</span>
                                <span className="min-w-20 text-muted">{leaveSlotText(leave.slot)}</span>
                                <span className="min-w-0 flex-1 text-ink">
                                    {leave.reason}
                                    {leave.rejectionReason && <span className="block text-caption text-danger">Lý do từ chối: {leave.rejectionReason}</span>}
                                    {leave.substituteName && <span className="block text-caption text-muted">Người thay: {leave.substituteName}</span>}
                                </span>
                                <span className={cx("badge", LEAVE_STATUS[leave.status]?.badge)}>{LEAVE_STATUS[leave.status]?.label ?? leave.status}</span>
                                {leave.status === "Pending" && (
                                    <button type="button" className="btn btn-secondary" onClick={async () => report(await cancelLeaveRequest(leave.id), "Đã rút đơn xin nghỉ.") && reload()}>
                                        Rút đơn
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {opened && (
                <ShiftDrawer
                    shift={opened}
                    tone={toneOf(opened)}
                    leave={leaveOf(opened)}
                    canAskLeave={leaveable.some((shift) => shift.id === opened.id)}
                    onAskLeave={() => {
                        setAsking({ shifts: leaveable, date: opened.scheduleDate });
                        setOpened(null);
                    }}
                    onClose={() => setOpened(null)}
                />
            )}

            {asking && (
                <LeaveDialog
                    shifts={asking.shifts}
                    initialDate={asking.date}
                    onClose={() => setAsking(null)}
                    onSubmit={async (values) => {
                        if (report(await createLeaveRequest(values), "Đã gửi đơn xin nghỉ. Chờ quản lý duyệt.")) {
                            setAsking(null);
                            reload();
                        }
                    }}
                />
            )}
        </div>
    );
};

// Details of one shift: hours, room, attendance and leave.
const ShiftDrawer = ({ shift, tone, leave, canAskLeave, onAskLeave, onClose }) => {
    const attendance =
        shift.isPresent === false
            ? `Vắng${shift.absenceReason ? ` · ${shift.absenceReason}` : ""}`
            : shift.actualStartTime
              ? `Vào ${hhmm(shift.actualStartTime)}${shift.actualEndTime ? ` · Ra ${hhmm(shift.actualEndTime)}` : " · đang trong ca"}`
              : "Chưa chấm công";
    const rows = [
        ["Ngày", dmy(shift.scheduleDate)],
        ["Giờ ca", `${hhmm(shift.shiftStart)}–${hhmm(shift.shiftEnd)}`],
        ["Phòng", shift.roomName ?? "Chưa gán phòng"],
        ["Nhiệm vụ", shift.assignment],
        ["Chấm công", attendance],
        ["Nghỉ", leave ? `${LEAVE_STATUS[leave.status]?.label ?? leave.status} · ${leaveSlotText(leave.slot)}` : null],
        ["Ghi chú", shift.notes],
    ].filter(([, value]) => value);

    return (
        <Drawer title={`Ca ${ddmm(shift.scheduleDate)} · ${hhmm(shift.shiftStart)}–${hhmm(shift.shiftEnd)}`} description={tone.label} onClose={onClose}>
            <dl className="flex flex-col gap-2 text-body-sm">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                        <dt className="w-24 shrink-0 text-muted">{label}</dt>
                        <dd className="min-w-0 font-medium text-ink">{value}</dd>
                    </div>
                ))}
            </dl>
            {canAskLeave && (
                <button type="button" className="btn btn-secondary mt-5" onClick={onAskLeave}>
                    <CalendarOff className="size-4" aria-hidden /> Xin nghỉ ca này
                </button>
            )}
        </Drawer>
    );
};

const LeaveDialog = ({ shifts, initialDate, onClose, onSubmit }) => {
    const dates = [...new Set(shifts.map((shift) => shift.scheduleDate))].sort();
    const [date, setDate] = useState(dates.includes(initialDate) ? initialDate : (dates[0] ?? ""));
    const [slot, setSlot] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    // Only offer the parts of the day that have a shift
    const slotsOfDay = new Set(shifts.filter((shift) => shift.scheduleDate === date).map((shift) => slotOfShift(shift.shiftStart)));
    const options = LEAVE_SLOTS.filter((option) => option.value === "" || slotsOfDay.has(option.value));
    const covered = shifts.filter((shift) => shift.scheduleDate === date && (!slot || slotOfShift(shift.shiftStart) === slot));

    return (
        <Modal title="Xin nghỉ" description="Chọn ngày có ca. Nghỉ cả ngày là nghỉ mọi ca trong ngày đó." onClose={onClose}>
            <form
                className="flex flex-col gap-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    await onSubmit({ leaveDate: date, slot, reason: reason.trim() });
                    setBusy(false);
                }}
            >
                <div className="field">
                    <label htmlFor="leave-date" className="label label-required">
                        Ngày nghỉ
                    </label>
                    <select
                        id="leave-date"
                        className="input"
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            setSlot("");
                        }}
                    >
                        {dates.map((d) => (
                            <option key={d} value={d}>
                                {dmy(d)}
                            </option>
                        ))}
                    </select>
                </div>
                <fieldset className="field">
                    <legend className="label">Buổi</legend>
                    <div className="flex flex-wrap gap-4">
                        {options.map((option) => (
                            <label key={option.value || "whole"} className="flex items-center gap-2 text-body-sm">
                                <input type="radio" name="leave-slot" className="size-4" checked={slot === option.value} onChange={() => setSlot(option.value)} />
                                {option.label}
                            </label>
                        ))}
                    </div>
                    <p className="text-caption text-muted">
                        Nghỉ {covered.length} ca: {covered.map((shift) => `${hhmm(shift.shiftStart)}–${hhmm(shift.shiftEnd)}`).join(", ")}
                    </p>
                </fieldset>
                <div className="field">
                    <label htmlFor="leave-reason" className="label label-required">
                        Lý do
                    </label>
                    <textarea id="leave-reason" className="input" rows={3} maxLength={500} required value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !date || !reason.trim()}>
                        Gửi đơn
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default WorkSchedule;
