import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Pagination from "@/components/ui/Pagination";
import { PRIORITY, getDoctorsOnDuty } from "@/services/receptionService";

// Formatting, status labels and hooks shared by the receptionist pages.

export const STATUS_LABEL = {
    PENDING: ["Chờ xác nhận", "badge-warning"],
    CONFIRMED: ["Đã xác nhận", "badge-success"],
    CHECKED_IN: ["Đã check-in", "badge-info"],
    IN_SERVICE: ["Đang khám", "badge-info"],
    COMPLETED: ["Đã khám xong", "badge-success"],
    CANCELLED: ["Đã hủy", "badge-neutral"],
    NO_SHOW: ["Không đến", "badge-danger"],
};

export const PRIORITY_LABEL = { [PRIORITY.NORMAL]: "Thường", [PRIORITY.HIGH]: "Ưu tiên", [PRIORITY.URGENT]: "Khẩn" };
export const PRIORITY_BADGE = { [PRIORITY.NORMAL]: "badge-neutral", [PRIORITY.HIGH]: "badge-warning", [PRIORITY.URGENT]: "badge-danger" };

export const INVOICE_LABEL = {
    UNPAID: ["Chưa thu", "badge-warning"],
    PENDING_CONFIRMATION: ["Chờ xác nhận chuyển khoản", "badge-info"],
    PARTIALLY_PAID: ["Thu một phần", "badge-info"],
    PAID: ["Đã thu đủ", "badge-success"],
    PARTIALLY_REFUNDED: ["Hoàn một phần", "badge-neutral"],
    REFUNDED: ["Đã hoàn", "badge-neutral"],
    CANCELLED: ["Đã hủy", "badge-neutral"],
};

// Booking.MaxDaysAhead: how far ahead a booking can be, so how far the confirmation list must look
export const BOOKING_DAYS_AHEAD = 30;
// Booking.PendingWarnHours: a PENDING booking this close to its time needs a call now (BR-APT-15)
const PENDING_WARN_HOURS = 2;

// True when the booking is still PENDING and starts within PENDING_WARN_HOURS from now (clinic time)
export const isPendingSoon = (a, today, now) => {
    if (a.status !== "PENDING" || !a.timeSlotStart || a.appointmentDate > today) return false;
    if (a.appointmentDate < today) return true;
    const [h, m] = now.split(":").map(Number);
    const limit = `${String(Math.min(23, h + PENDING_WARN_HOURS)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return a.timeSlotStart.slice(0, 5) <= limit;
};

export const DUTY_LABEL = { Working: "Đang làm", NotStarted: "Chưa vào ca", Ended: "Đã kết thúc ca", OnLeave: "Nghỉ phép" };

export const money = (value) => `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
export const hhmm = (time) => (time ? time.slice(0, 5) : null);
export const slotText = (a) => (a.timeSlotStart ? `${hhmm(a.timeSlotStart)} – ${hhmm(a.timeSlotEnd)}` : "Vãng lai");
export const clockOf = (dateTime) =>
    dateTime ? new Date(dateTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : null;
export const ddmm = (date) => (date ? date.split("-").reverse().slice(0, 2).join("/") : "");
export const dmy = (date) => (date ? date.split("-").reverse().join("/") : "");
export const phoneText = (phone) => (phone ?? "").replace(/^\+84/, "0").replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");
export const servicesOf = (appointment) =>
    appointment.services?.length
        ? appointment.services.map((s) => (s.variantName ? `${s.serviceName} · ${s.variantName}` : s.serviceName)).join(", ")
        : appointment.serviceName;
export const weekdayDate = (date) =>
    new Date(`${date}T12:00:00+07:00`).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    });

// Clinic time now as "HH:mm", comparable with shift and slot times
export const clinicClock = () =>
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

// Whole minutes since a moment (0 when missing or in the future)
export const minutesSince = (moment, now = Date.now()) => (moment ? Math.max(0, Math.floor((now - new Date(moment).getTime()) / 60_000)) : 0);

// How long someone has waited, as a colour: calm under 15 minutes, watch 15–30, act over 30
export const waitTone = (minutes) => (minutes >= 30 ? "danger" : minutes >= 15 ? "warning" : "success");
export const WAIT_TONE_CLASS = {
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
};

// "0912 345 678" → "…5678" with the patient code, to tell apart two people with the same name
export const phoneTail = (phone) => (phone ? `…${phone.replace(/\D/g, "").slice(-4)}` : "");

// Minutes since midnight of a "HH:mm[:ss]" time
export const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// Shows the server's message in a toast and says whether it worked
export const report = (result, successText) => {
    if (result.success) toast.success(successText ?? result.message);
    else toast.error(result.message || "Thao tác không thành công.");
    return result.success;
};

// Client-side paging of a loaded list: the rows of the current page and the "1–5 / 9" footer with page buttons
export const usePaging = (items, pageSize = 10) => {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const current = Math.min(page, totalPages);
    const start = (current - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const footer =
        items.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                <p className="num text-body-sm text-muted">
                    {start + 1}–{start + pageItems.length} / {items.length}
                </p>
                {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
            </div>
        ) : null;
    return { setPage, pageItems, footer };
};

// Doctors with a shift today, one row per doctor (the shift that matters now), and the ones still able to take patients
export const useDoctorsOnDuty = (refreshKey = 0) => {
    const [shifts, setShifts] = useState([]);
    useEffect(() => {
        let active = true;
        getDoctorsOnDuty().then((result) => active && result.success && setShifts(result.data));
        return () => {
            active = false;
        };
    }, [refreshKey]);
    return useMemo(() => {
        const now = clinicClock();
        const RANK = { Working: 0, NotStarted: 1, Ended: 2, OnLeave: 3 };
        // A shift never started whose time is over matters less than the next one
        const rankOf = (s) => (s.status === "NotStarted" && hhmm(s.shiftEnd) <= now ? 2.5 : RANK[s.status]);
        const map = new Map();
        shifts.forEach((s) => {
            const known = map.get(s.doctorId);
            // Same rank: the later shift is the one that matters now
            if (known && (known.rank < rankOf(s) || (known.rank === rankOf(s) && hhmm(s.shiftStart) < known.start))) return;
            map.set(s.doctorId, {
                id: s.doctorId,
                name: s.doctorName,
                room: s.roomName,
                status: s.status,
                rank: rankOf(s),
                shift: `${hhmm(s.shiftStart)}–${hhmm(s.shiftEnd)}`,
                start: hhmm(s.shiftStart),
                end: hhmm(s.shiftEnd),
            });
        });
        const doctors = [...map.values()];
        return { doctors, available: doctors.filter((d) => d.status === "Working" || d.status === "NotStarted") };
    }, [shifts]);
};

// A doctor counts as late after this many minutes past the shift start without pressing "start shift"
export const LATE_START_GRACE = 5;

// Minutes a doctor is late to start the shift: the shift time has come but the doctor has not started it yet.
// Keeps counting after the shift time is over (the doctor never came). 0 when started or not due yet.
export const lateStartMinutes = (doctor, now = clinicClock()) => {
    if (doctor?.status !== "NotStarted" || !doctor.start || now < doctor.start) return 0;
    const late = toMinutes(now) - toMinutes(doctor.start);
    return late >= LATE_START_GRACE ? late : 0;
};

// The whole shift time went by and the doctor never started it
export const missedShift = (doctor, now = clinicClock()) => doctor?.status === "NotStarted" && !!doctor.end && now >= doctor.end;

// What the counter says about a doctor right now, and its tone: "Đang làm", "Vào ca 13:00", "Trễ 12 phút", ...
export const dutyText = (doctor, now = clinicClock()) => {
    if (!doctor?.status) return ["", "neutral"];
    if (doctor.status === "Working") return ["Đang làm", "success"];
    if (doctor.status === "NotStarted") {
        if (missedShift(doctor, now)) return ["Không vào ca", "warning"];
        const late = lateStartMinutes(doctor, now);
        if (late) return [`Trễ vào ca ${late} phút`, "warning"];
        return now < doctor.start ? [`Vào ca ${doctor.start}`, "neutral"] : ["Sắp vào ca", "neutral"];
    }
    return [DUTY_LABEL[doctor.status] ?? doctor.status, "neutral"];
};

// Wraps a submit so the button shows progress and cannot be pressed twice
export const useSubmit = (onSubmit) => {
    const [busy, setBusy] = useState(false);
    const submit = async (...args) => {
        setBusy(true);
        try {
            await onSubmit(...args);
        } finally {
            setBusy(false);
        }
    };
    return [busy, submit];
};
