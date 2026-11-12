import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, DoorOpen, LogIn, LogOut } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { DialogActions } from "@/components/reception/shared";
import { clinicClock, hhmm, report, toMinutes, useSubmit } from "@/components/reception/receptionUtils";
import { clinicToday } from "@/services/receptionService";
import { endMyShift, getMyShifts, startMyShift } from "@/services/myScheduleService";
import { getSessionRole } from "@/services/sessionStore";
import { USER_ROLES } from "@/utils/messages";
import { cx } from "@/utils/cx";

// "Ca của tôi": the clock-in of every staff member (F-RCP-08). Shows today's shift and the room it is in,
// "Bắt đầu ca" from 30 minutes before the shift, then "Đang làm từ 08:02" with "Kết thúc ca".
// The rest of the system follows it: a doctor calls new patients only between the two, the counter sees who is in,
// and ending a doctor's shift hands the patients not seen yet to the front desk.

const CLOCK_IN_EARLY_MINUTES = 30;

// The shift that matters now: the one running, else the next one still to come, else the last one of the day
const pickShift = (shifts, now) => {
    const sorted = [...shifts].filter((s) => s.isPresent !== false).sort((a, b) => a.shiftStart.localeCompare(b.shiftStart));
    return (
        sorted.find((s) => s.actualStartTime && !s.actualEndTime) ??
        sorted.find((s) => !s.actualStartTime && now < hhmm(s.shiftEnd)) ??
        sorted.filter((s) => s.actualEndTime).at(-1) ??
        sorted.at(-1) ??
        null
    );
};

const MyShiftBar = ({ queueTo, queueLabel = "Mở hàng chờ", onChange }) => {
    const [state, setState] = useState({ loading: true, shifts: [] });
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [, setTick] = useState(0);
    const isDoctor = getSessionRole() === USER_ROLES.DOCTOR;

    const load = useCallback(
        () => getMyShifts({ fromDate: clinicToday(), toDate: clinicToday() }).then((r) => setState({ loading: false, shifts: r.success ? r.data : [] })),
        [],
    );

    useEffect(() => {
        load();
        // The buttons open and close with the clock
        const timer = setInterval(() => setTick((t) => t + 1), 60_000);
        return () => clearInterval(timer);
    }, [load]);

    const [busy, run] = useSubmit(async (action, successText) => {
        if (report(await action, successText)) {
            setConfirmEnd(false);
            await load();
            onChange?.();
        }
    });

    if (state.loading) return null;

    const now = clinicClock();
    const shift = pickShift(state.shifts, now);
    if (!shift)
        return (
            <p className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-canvas px-4 py-3 text-body-sm text-muted">
                <Clock className="size-4" aria-hidden /> Hôm nay bạn không có ca làm việc.
            </p>
        );

    const start = hhmm(shift.shiftStart);
    const end = hhmm(shift.shiftEnd);
    // Where the shift is worked; a shift without a room (e.g. the front desk when no counter room exists) says so
    const room = shift.roomName ?? "Ca làm hôm nay (chưa gán phòng)";
    const atRoom = shift.roomName ? ` ở ${shift.roomName}` : "";
    const running = shift.actualStartTime && !shift.actualEndTime;
    const ended = !!shift.actualEndTime;
    const over = !shift.actualStartTime && now >= end;
    const opensAt = Math.max(0, toMinutes(start) - CLOCK_IN_EARLY_MINUTES);
    const canStart = !shift.actualStartTime && !over && toMinutes(now) >= opensAt;
    const late = !shift.actualStartTime && !over && now > start ? toMinutes(now) - toMinutes(start) : 0;
    const otherShifts = state.shifts.length - 1;

    const tone = running ? "success" : late || over ? "warning" : "neutral";

    return (
        <section
            aria-label="Ca của tôi"
            className={cx(
                "mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border px-4 py-3",
                tone === "success" && "border-success/40 bg-success-soft",
                tone === "warning" && "border-warning/60 bg-warning-soft",
                tone === "neutral" && "border-border bg-canvas",
            )}
        >
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                    aria-hidden
                    className={cx(
                        "grid size-10 shrink-0 place-items-center rounded-lg",
                        running ? "bg-success-solid text-white" : "bg-surface-muted text-muted",
                    )}
                >
                    <DoorOpen className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate font-heading text-title font-semibold text-ink">{room}</p>
                    <p className={cx("text-body-sm", tone === "warning" ? "text-warning" : "text-muted")}>
                        Ca {start}–{end}
                        {running && `, đang làm từ ${hhmm(shift.actualStartTime)}`}
                        {ended && `, đã kết thúc lúc ${hhmm(shift.actualEndTime)}`}
                        {late > 0 && `, bạn đang trễ ${late} phút`}
                        {over && ", đã hết giờ mà chưa bắt đầu ca"}
                        {!shift.actualStartTime &&
                            !over &&
                            !canStart &&
                            `, bấm bắt đầu được từ ${String(Math.floor(opensAt / 60)).padStart(2, "0")}:${String(opensAt % 60).padStart(2, "0")}`}
                        {otherShifts > 0 && ` (hôm nay còn ${otherShifts} ca khác)`}
                    </p>
                    {!shift.actualStartTime && !over && isDoctor && <p className="text-caption text-muted">Chưa bắt đầu ca thì chưa gọi được bệnh nhân mới.</p>}
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {running && queueTo && (
                    <Link to={queueTo} className="btn btn-secondary">
                        {queueLabel}
                    </Link>
                )}
                {!shift.actualStartTime && !over && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!canStart || busy}
                        onClick={() => run(startMyShift(shift.id), `Đã bắt đầu ca${atRoom}.`)}
                    >
                        <LogIn className="size-4" aria-hidden /> Bắt đầu ca
                    </button>
                )}
                {running && (
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirmEnd(true)}>
                        <LogOut className="size-4" aria-hidden /> Kết thúc ca
                    </button>
                )}
            </div>

            {confirmEnd && (
                <Modal title="Kết thúc ca" description={`Ca ${start}–${end}${atRoom}, kết thúc lúc ${now}.`} onClose={() => setConfirmEnd(false)}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            run(endMyShift(shift.id), "Đã kết thúc ca.");
                        }}
                    >
                        {isDoctor ? (
                            <ul className="mb-4 list-disc space-y-1 pl-5 text-body-sm text-ink">
                                <li>Khám xong bệnh nhân đang trong phòng trước, nếu không sẽ không kết thúc được.</li>
                                <li>Bệnh nhân đã hẹn trong ca, quá giờ mà chưa đến sẽ được ghi là không đến.</li>
                                <li>Người đang chờ và người hẹn giờ sau sẽ được nhắn tin và chuyển cho lễ tân xếp bác sĩ khác hoặc đổi lịch.</li>
                            </ul>
                        ) : (
                            <p className="mb-4 text-body-sm text-ink">Giờ ra ca được ghi lại để tính công.</p>
                        )}
                        <DialogActions onClose={() => setConfirmEnd(false)} submitLabel="Kết thúc ca" busy={busy} danger={isDoctor} />
                    </form>
                </Modal>
            )}
        </section>
    );
};

export default MyShiftBar;
