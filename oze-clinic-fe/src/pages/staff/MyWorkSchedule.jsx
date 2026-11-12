import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "@/components/ui/Modal";
import MyShiftBar from "@/components/staff/MyShiftBar";
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

// "Lịch làm việc" for doctors, receptionists and imaging technicians: my shifts by week, and my leave requests.
// Leave is taken from shifts the manager assigned, so only days with a shift can be picked; the manager approves it.

const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const hhmm = (time) => time?.slice(0, 5) ?? "";
const ddmm = (date) => date.split("-").reverse().slice(0, 2).join("/");
const dmy = (date) => date.split("-").reverse().join("/");

const addDays = (date, days) => {
    const [y, m, d] = date.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + days));
    return next.toISOString().slice(0, 10);
};
// Monday of the week the date falls in
const mondayOf = (date) => {
    const [y, m, d] = date.split("-").map(Number);
    const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
    return addDays(date, -weekday);
};

const report = (result, successText) => {
    if (result.success) toast.success(successText ?? result.message);
    else toast.error(result.message || "Thao tác không thành công.");
    return result.success;
};

const MyWorkSchedule = () => {
    const today = clinicToday();
    const [weekStart, setWeekStart] = useState(() => mondayOf(today));
    const [shifts, setShifts] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [asking, setAsking] = useState(null);
    const [version, setVersion] = useState(0);

    // Two weeks at a time: the week shown and the next one, so "Xin nghỉ" can offer days ahead
    const fetchData = useCallback(() => Promise.all([getMyShifts({ fromDate: weekStart, toDate: addDays(weekStart, 13) }), getMyLeaveRequests()]), [weekStart]);

    useEffect(() => {
        let active = true;
        fetchData().then(([shiftResult, leaveResult]) => {
            if (!active) return;
            setShifts(shiftResult.success ? shiftResult.data : []);
            setLeaves(leaveResult.success ? leaveResult.data.items : []);
            setLoadError(shiftResult.success ? null : shiftResult.message);
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [fetchData, version]);

    const reload = () => setVersion((current) => current + 1);

    const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

    // Pending or approved leave that covers the shift
    const leaveOf = (shift) =>
        leaves.find(
            (leave) =>
                leave.leaveDate === shift.scheduleDate &&
                ["Pending", "Approved"].includes(leave.status) &&
                (!leave.slot || leave.slot === slotOfShift(shift.shiftStart)),
        );

    // Future shifts without leave yet can still be asked off
    const leaveable = shifts.filter((shift) => `${shift.scheduleDate}T${hhmm(shift.shiftStart)}` > nowClinic() && !leaveOf(shift));

    return (
        <div className="app-content min-h-full">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Lịch làm việc</h1>
                    <p className="page-description">Ca được quản lý phân. Muốn nghỉ ca nào thì gửi đơn, quản lý duyệt rồi mới được nghỉ.</p>
                </div>
                <button type="button" className="btn btn-primary" disabled={leaveable.length === 0} onClick={() => setAsking({ shifts: leaveable })}>
                    Xin nghỉ
                </button>
            </header>

            <MyShiftBar onChange={reload} />

            {loadError && (
                <p role="alert" className="mb-4 rounded-lg border border-danger-solid/40 bg-danger-soft px-4 py-3 text-body-sm text-danger">
                    Không tải được lịch: {loadError}
                </p>
            )}

            <div className="mb-3 flex items-center gap-2">
                <button type="button" className="btn btn-secondary btn-icon" aria-label="Tuần trước" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                    <ChevronLeft className="size-4" aria-hidden />
                </button>
                <p className="num min-w-44 text-center text-label text-ink">
                    {dmy(weekStart)} – {dmy(addDays(weekStart, 6))}
                </p>
                <button type="button" className="btn btn-secondary btn-icon" aria-label="Tuần sau" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    <ChevronRight className="size-4" aria-hidden />
                </button>
                {weekStart !== mondayOf(today) && (
                    <button type="button" className="btn btn-link" onClick={() => setWeekStart(mondayOf(today))}>
                        Tuần này
                    </button>
                )}
            </div>

            <section aria-label="Ca làm trong tuần" className={cx("grid gap-2 sm:grid-cols-7", loading && "opacity-60")}>
                {days.map((day, index) => {
                    const dayShifts = shifts.filter((shift) => shift.scheduleDate === day);
                    return (
                        <div
                            key={day}
                            className={cx("min-h-28 rounded-lg border p-3", day === today ? "border-primary bg-primary-softer" : "border-border bg-canvas")}
                        >
                            <p className={cx("text-caption", day === today ? "font-semibold text-primary" : "text-muted")}>
                                {WEEKDAYS[index]} <span className="num">{ddmm(day)}</span>
                            </p>
                            {dayShifts.length === 0 ? (
                                <p className="mt-2 text-caption text-placeholder">Không có ca</p>
                            ) : (
                                dayShifts.map((shift) => {
                                    const leave = leaveOf(shift);
                                    const absent = shift.isPresent === false;
                                    return (
                                        <div
                                            key={shift.id}
                                            className={cx(
                                                "mt-2 rounded-md px-2 py-1.5 text-caption",
                                                leave?.status === "Pending"
                                                    ? "border border-dashed border-warning bg-warning-soft text-warning"
                                                    : leave || absent
                                                      ? "bg-surface-muted text-muted line-through"
                                                      : "bg-primary-soft text-primary",
                                            )}
                                        >
                                            <p className="num font-semibold">
                                                {hhmm(shift.shiftStart)}–{hhmm(shift.shiftEnd)}
                                            </p>
                                            <p>{shift.roomName ?? shift.assignment ?? "Chưa gán phòng"}</p>
                                            {leave?.status === "Pending" && <p>Chờ duyệt nghỉ</p>}
                                            {(leave?.status === "Approved" || absent) && <p className="inline-block font-semibold">Nghỉ</p>}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    );
                })}
            </section>

            <section aria-labelledby="my-leaves-title" className="mt-6 rounded-lg border border-border bg-canvas">
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
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={async () => report(await cancelLeaveRequest(leave.id), "Đã rút đơn xin nghỉ.") && reload()}
                                    >
                                        Rút đơn
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {asking && (
                <LeaveDialog
                    shifts={asking.shifts}
                    onClose={() => setAsking(null)}
                    onSubmit={async (values) => {
                        const ok = report(await createLeaveRequest(values), "Đã gửi đơn xin nghỉ. Chờ quản lý duyệt.");
                        if (ok) {
                            setAsking(null);
                            reload();
                        }
                    }}
                />
            )}
        </div>
    );
};

// Clinic "now" as yyyy-mm-ddTHH:mm, comparable with a shift's date and start time
const nowClinic = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};

const LeaveDialog = ({ shifts, onClose, onSubmit }) => {
    const dates = [...new Set(shifts.map((shift) => shift.scheduleDate))].sort();
    const [date, setDate] = useState(dates[0] ?? "");
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
                                <input
                                    type="radio"
                                    name="leave-slot"
                                    className="size-4"
                                    checked={slot === option.value}
                                    onChange={() => setSlot(option.value)}
                                />
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
                    <textarea
                        id="leave-reason"
                        className="input"
                        rows={3}
                        maxLength={500}
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
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

export default MyWorkSchedule;
