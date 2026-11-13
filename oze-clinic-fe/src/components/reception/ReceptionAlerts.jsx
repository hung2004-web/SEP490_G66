import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { clinicClock, hhmm, lateStartMinutes, minutesSince, missedShift, toMinutes, useDoctorsOnDuty } from "./receptionUtils";
import { getNeedsAttention, getTodayAppointments, getWaitingList } from "@/services/receptionService";
import { ROUTES } from "@/utils/routes";
import { cx } from "@/utils/cx";

// "Cần xử lý ngay": every problem at the counter in one list, the worst first, each with the page that clears it.
// Red: a doctor late to start the shift while patients wait, a doctor whose shift ended with patients left (F-RCP-07).
// Amber: someone waiting over 30 minutes, booked patients over 15 minutes late, plus what the page adds (`extra`).
// Refreshes every minute. Shows nothing when all is well, or a calm line when `showAllClear`.

const LATE_MINUTES = 15;
const LONG_WAIT_MINUTES = 30;

const load = async () => {
    const [attention, today, waiting] = await Promise.all([getNeedsAttention(), getTodayAppointments(), getWaitingList()]);
    const now = toMinutes(clinicClock());
    return {
        attention: attention.success ? attention.data : [],
        waiting: waiting.success ? waiting.data : [],
        late: (today.success ? today.data.items : []).filter(
            (a) => ["CONFIRMED", "PENDING"].includes(a.status) && a.timeSlotStart && now - toMinutes(a.timeSlotStart) > LATE_MINUTES,
        ),
    };
};

const names = (list, toText) => `${list.slice(0, 3).map(toText).join(", ")}${list.length > 3 ? "…" : ""}`;

const ReceptionAlerts = ({ extra = [], showAllClear = false }) => {
    const [data, setData] = useState({ attention: [], waiting: [], late: [] });
    const [round, setRound] = useState(0);
    const { doctors } = useDoctorsOnDuty(round);

    useEffect(() => {
        let active = true;
        load().then((next) => active && setData(next));
        return () => {
            active = false;
        };
    }, [round]);

    useEffect(() => {
        const timer = setInterval(() => setRound((r) => r + 1), 60_000);
        return () => clearInterval(timer);
    }, []);

    const alerts = [];

    // Doctors late to start while their patients wait
    const lateDoctors = doctors
        .map((d) => ({ ...d, late: lateStartMinutes(d), waiting: data.waiting.filter((w) => w.doctorId === d.id) }))
        .filter((d) => d.late && d.waiting.length);
    lateDoctors.forEach((d) =>
        alerts.push({
            key: `late-${d.id}`,
            tone: "danger",
            text: missedShift(d)
                ? `${d.name} không vào ca (ca ${d.start}–${d.end} đã hết giờ), ${d.waiting.length} khách vẫn đang chờ. Chuyển khách sang bác sĩ khác hoặc đổi lịch.`
                : `${d.name} trễ vào ca ${d.late} phút (ca ${d.start}), ${d.waiting.length} khách đang chờ. Gọi bác sĩ hoặc chuyển khách sang bác sĩ khác.`,
            to: ROUTES.RECEPTION_QUEUE,
            action: "Chuyển ở Hàng chờ",
        }),
    );

    // Doctors whose shift ended with patients left
    const ended = [...new Set(data.attention.map((x) => x.doctorName))];
    if (ended.length)
        alerts.push({
            key: "ended",
            tone: "danger",
            text: `${ended.join(", ")} đã hết ca nhưng còn ${data.attention.length} bệnh nhân đang chờ hoặc có hẹn. Chuyển sang bác sĩ khác hoặc đổi lịch.`,
            to: ROUTES.RECEPTION_QUEUE,
            action: "Xử lý ở Hàng chờ",
        });

    // Long waits, apart from the patients of a late doctor (already said above)
    const lateDoctorIds = new Set(lateDoctors.map((d) => d.id));
    const longWait = data.waiting
        .filter((w) => !lateDoctorIds.has(w.doctorId) && minutesSince(w.checkInAt) > LONG_WAIT_MINUTES)
        .sort((a, b) => new Date(a.checkInAt) - new Date(b.checkInAt));
    if (longWait.length)
        alerts.push({
            key: "long-wait",
            tone: "warning",
            text: `${longWait.length} khách chờ khám quá ${LONG_WAIT_MINUTES} phút: ${names(longWait, (w) => `${w.patientName} (${minutesSince(w.checkInAt)} phút)`)}. Hỏi thăm khách, báo thời gian còn lại.`,
            to: ROUTES.RECEPTION_QUEUE,
            action: "Xem hàng chờ",
        });

    if (data.late.length)
        alerts.push({
            key: "late-patients",
            tone: "warning",
            text: `${data.late.length} khách quá giờ hẹn hơn ${LATE_MINUTES} phút chưa đến: ${names(data.late, (a) => `${a.patientName} (${hhmm(a.timeSlotStart)})`)}. Gọi hỏi khách hoặc đổi lịch.`,
            to: ROUTES.RECEPTION_CHECK_IN,
            action: "Xem ở Check-in",
        });

    alerts.push(...extra);
    alerts.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "danger" ? -1 : 1));

    if (alerts.length === 0)
        return showAllClear ? (
            <p role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-success/40 bg-success-soft px-4 py-3 text-body-sm text-success">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Không có việc gì bất thường ở quầy.
            </p>
        ) : null;

    return (
        <section aria-label="Cần xử lý ngay" role="status" className="mb-5 overflow-hidden rounded-xl border border-border bg-canvas">
            <h2 className="border-b border-border px-4 py-2.5 text-label font-semibold text-ink">Cần xử lý ngay ({alerts.length})</h2>
            <ul className="divide-y divide-border">
                {alerts.map((a) => {
                    const Icon = a.tone === "danger" ? AlertTriangle : Clock;
                    return (
                        <li
                            key={a.key}
                            className={cx(
                                "flex flex-wrap items-center gap-3 border-l-4 px-4 py-2.5 text-body-sm",
                                a.tone === "danger" ? "border-l-danger-solid bg-danger-soft text-danger" : "border-l-warning-solid text-warning",
                            )}
                        >
                            <Icon className="size-4 shrink-0" aria-hidden />
                            <p className="min-w-0 flex-1">{a.text}</p>
                            {a.to && (
                                <Link to={a.to} className="btn btn-secondary h-9">
                                    {a.action}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default ReceptionAlerts;
