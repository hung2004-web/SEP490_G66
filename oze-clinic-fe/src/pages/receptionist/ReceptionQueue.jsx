import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRightLeft, UserPlus } from "lucide-react";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import ReceptionAlerts from "@/components/reception/ReceptionAlerts";
import { EmptyState, ErrorLine, NoShowDialog, PageHeader, PriorityDialog, ReassignDialog, RescheduleDialog, WalkInDialog } from "@/components/reception/shared";
import {
    PRIORITY_BADGE,
    PRIORITY_LABEL,
    WAIT_TONE_CLASS,
    clinicClock,
    clockOf,
    dutyText,
    hhmm,
    lateStartMinutes,
    minutesSince,
    missedShift,
    money,
    phoneTail,
    report,
    servicesOf,
    toMinutes,
    useDoctorsOnDuty,
    waitTone,
} from "@/components/reception/receptionUtils";
import {
    PRIORITY,
    clinicToday,
    createWalkIn,
    getNeedsAttention,
    getOpenInvoices,
    getQueueEntries,
    getRecentInvoices,
    getTodayAppointments,
    getWaitingList,
    markNoShow,
    reassignDoctor,
    rescheduleAppointment,
    setPriority,
} from "@/services/receptionService";
import { ROUTES } from "@/utils/routes";
import { cx } from "@/utils/cx";

// "Hàng chờ": one column per doctor's room, in the order the doctor will call (BR-RCP-02: priority, then back from
// X-ray, booked on time, booked late, walk-in). Each person shows how long they have waited, coloured so the one
// getting impatient stands out, and a rough time until their turn from the length of the services before them.
// The counter changes priority, marks a patient who left, and moves patients of a doctor whose shift ended.
// Keys: F2 search, F3 take a walk-in.

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }));

const LONG_WAIT_MINUTES = 30;
const isToday = (moment) => moment && new Date(moment).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }) === clinicToday();

const fetchQueue = async () => {
    const [waiting, appointments, attention, entries, open, recent] = await Promise.all([
        getWaitingList(),
        getTodayAppointments(),
        getNeedsAttention(),
        getQueueEntries(),
        getOpenInvoices(),
        getRecentInvoices(),
    ]);
    const failed = [waiting, appointments, attention].find((r) => !r.success);
    const today = appointments.data?.items ?? [];
    const invoiced = new Set((recent.data?.items ?? []).filter((i) => i.paymentStatus !== "CANCELLED" && i.appointmentId).map((i) => i.appointmentId));
    return {
        error: failed?.message ?? null,
        waiting: waiting.data ?? [],
        today,
        attention: attention.data ?? [],
        // X-ray and treatment rooms run their own queue; examination rooms come from the waiting list above
        others: (entries.data ?? []).filter((e) => e.queueType !== "Examination"),
        // The last step of the visit: done today without an invoice, or invoiced today and not paid yet
        uninvoiced: today.filter((a) => a.status === "COMPLETED" && !invoiced.has(a.id)),
        unpaid: (open.data?.items ?? []).filter((i) => isToday(i.createdAt)),
    };
};

// Minutes a visit takes: the services saved on the appointment (30 when unknown)
const durationOf = (appointment) => (appointment?.services ?? []).reduce((sum, s) => sum + (s.durationMinutes || 0), 0) || 30;

const ReceptionQueue = () => {
    const [data, setData] = useState({ loading: true, waiting: [], today: [], attention: [], others: [], uninvoiced: [], unpaid: [], error: null });
    const [version, setVersion] = useState(0);
    const [filters, setFilters] = useState({ keyword: "", priority: "", longOnly: false });
    const [dialog, setDialog] = useState(null);
    const [, setTick] = useState(0);
    const searchRef = useRef(null);
    const { doctors, available } = useDoctorsOnDuty(version);

    useEffect(() => {
        let active = true;
        const load = () => fetchQueue().then((next) => active && setData({ loading: false, ...next }));
        load();
        // Doctors call patients from their own screen; refresh in place every 20 seconds
        const timer = setInterval(load, 20_000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [version]);

    // Waiting minutes move on even between refreshes
    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), 60_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === "F2") {
                event.preventDefault();
                searchRef.current?.querySelector("input")?.focus();
            }
            if (event.key === "F3" && available.length > 0) {
                event.preventDefault();
                setDialog({ type: "walkIn" });
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [available.length]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const act = async (request, successText) => {
        if (report(await request, successText)) {
            setDialog(null);
            reload();
        }
    };

    const byId = new Map(data.today.map((a) => [a.id, a]));
    const q = filters.keyword.trim().toLowerCase();
    const match = (w) =>
        (!q || `${w.patientName} ${w.patientCode}`.toLowerCase().includes(q)) &&
        (!filters.priority || String(w.priority) === filters.priority) &&
        (!filters.longOnly || w.waited > LONG_WAIT_MINUTES);
    const now = clinicClock();

    // Moves every waiting patient of one doctor to another, one by one (the same check as moving one person)
    const moveAll = async (room, doctorId) => {
        let moved = 0;
        const failures = [];
        for (const w of room.rows) {
            const result = await reassignDoctor(w.appointmentId, doctorId);
            if (result.success) moved += 1;
            else failures.push(`${w.patientName}: ${result.message}`);
        }
        report(
            { success: failures.length === 0, message: `Đã chuyển ${moved}/${room.rows.length} khách. ${failures.join("; ")}` },
            `Đã chuyển ${moved} khách của ${room.name} sang bác sĩ khác.`,
        );
        setDialog(null);
        reload();
    };

    // One column per doctor with anyone in the room or waiting, plus doctors on shift with an empty room
    const doctorIds = [
        ...new Set([
            ...data.waiting.map((w) => w.doctorId),
            ...data.today.filter((a) => a.status === "IN_SERVICE").map((a) => a.doctorId),
            ...doctors.filter((d) => d.status === "Working" || d.status === "NotStarted").map((d) => d.id),
        ]),
    ].filter(Boolean);
    const rooms = doctorIds.map((id) => {
        const duty = doctors.find((d) => d.id === id);
        const serving = data.today.find((a) => a.doctorId === id && a.status === "IN_SERVICE");
        const queue = data.waiting.filter((w) => w.doctorId === id);
        const late = lateStartMinutes(duty, now);
        // Doctor not in yet: no honest turn time when late or the shift is over; before the shift, count from its start
        const notIn = duty?.status && duty.status !== "Working";
        const noEta = notIn && (late > 0 || duty.status !== "NotStarted" || now >= duty.start);
        // Rough turn: half of the visit in the room, then every visit before this person
        let ahead = serving ? Math.round(durationOf(serving) / 2) : notIn && !noEta ? toMinutes(duty.start) - toMinutes(now) : 0;
        const rows = queue.map((w) => {
            const row = { ...w, waited: minutesSince(w.checkInAt), eta: noEta ? null : ahead, appointment: byId.get(w.appointmentId) };
            ahead += durationOf(row.appointment);
            return row;
        });
        return {
            id,
            name: duty?.name ?? queue[0]?.doctorName ?? serving?.doctorName,
            room: duty?.room ?? queue[0]?.roomName ?? serving?.roomName,
            duty,
            late,
            notIn,
            shift: duty?.shift,
            serving,
            rows,
        };
    });

    // Other rooms (X-ray, treatment): one column per room with anyone in its queue
    const otherRooms = [...new Map(data.others.map((e) => [`${e.queueType}-${e.roomId ?? "none"}`, e])).entries()].map(([key, first]) => ({
        key,
        type: first.queueType,
        name: first.roomName ?? (first.queueType === "Imaging" ? "Phòng chụp phim" : "Phòng thủ thuật"),
        staff: first.staffName,
        entries: data.others
            .filter((e) => `${e.queueType}-${e.roomId ?? "none"}` === key)
            .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.priority - a.priority || a.queueNumber - b.queueNumber),
    }));

    const otherWaiting = data.others.filter((e) => e.status !== "IN_PROGRESS");
    const total = data.waiting.length + otherWaiting.length;
    const longest = Math.max(0, ...data.waiting.map((w) => minutesSince(w.checkInAt)), ...otherWaiting.map((e) => minutesSince(e.createdAt)));
    const inService = data.today.filter((a) => a.status === "IN_SERVICE");
    const endedGroups = [...new Map(data.attention.map((x) => [x.doctorId, x])).values()].map((first) => ({
        doctorName: first.doctorName,
        shiftEndedAt: first.shiftEndedAt,
        items: data.attention.filter((x) => x.doctorId === first.doctorId),
    }));

    return (
        <div className="app-content min-h-full">
            <PageHeader
                title="Hàng chờ"
                description={data.loading ? "" : `${total} người đang chờ${total ? `, lâu nhất ${longest} phút` : ""}. Bác sĩ gọi theo thứ tự trong từng cột.`}
            >
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setDialog({ type: "walkIn" })}
                    disabled={available.length === 0}
                    title="Phím tắt F3"
                >
                    <UserPlus className="size-4" aria-hidden /> Tiếp nhận khách vãng lai
                </button>
            </PageHeader>
            <ReceptionAlerts />
            <ErrorLine message={data.error} />

            {endedGroups.map((group) => (
                <section key={group.doctorName} className="mb-5 rounded-xl border border-danger-solid/40 bg-canvas">
                    <h2 className="border-b border-border px-5 py-3 text-label text-danger">
                        {group.doctorName} đã hết ca lúc {hhmm(group.shiftEndedAt) ?? "?"}: chuyển người đang chờ, đổi lịch người đã hẹn
                    </h2>
                    <ul className="divide-y divide-border">
                        {group.items.map((item) => (
                            <li key={item.appointmentId} className="flex flex-wrap items-center gap-3 px-5 py-2 text-body-sm">
                                <span className="min-w-48 flex-1 text-ink">
                                    {item.patientName} <span className="text-muted">{phoneTail(item.patientPhoneNumber)}</span>
                                    <span className="block text-caption text-muted">
                                        {item.group === "WAITING" ? "Đang chờ ở phòng khám" : `Hẹn ${hhmm(item.timeSlotStart)}`}
                                        {item.hasExamination && ", đã bắt đầu khám"}
                                    </span>
                                </span>
                                {item.group === "WAITING" ? (
                                    <button type="button" className="btn btn-primary h-9" onClick={() => setDialog({ type: "reassign", item })}>
                                        Chuyển bác sĩ
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-secondary h-9"
                                        onClick={() => {
                                            const a = byId.get(item.appointmentId);
                                            if (a) setDialog({ type: "reschedule", item: a });
                                        }}
                                    >
                                        Đổi lịch hẹn
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            <div className="mb-4 flex flex-wrap items-center gap-3" ref={searchRef}>
                <SearchInput
                    id="q-search"
                    label="Tìm bệnh nhân"
                    placeholder="Tên hoặc mã bệnh nhân (F2)"
                    value={filters.keyword}
                    onChange={(v) => setFilters((f) => ({ ...f, keyword: v }))}
                    className="min-w-64 flex-1"
                />
                <FilterSelect
                    id="q-priority"
                    label="Ưu tiên"
                    options={PRIORITY_OPTIONS}
                    value={filters.priority}
                    onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
                />
                <button
                    type="button"
                    aria-pressed={filters.longOnly}
                    onClick={() => setFilters((f) => ({ ...f, longOnly: !f.longOnly }))}
                    className={cx("btn h-10", filters.longOnly ? "btn-primary" : "btn-secondary")}
                >
                    Chỉ người chờ trên {LONG_WAIT_MINUTES} phút
                </button>
            </div>

            {data.loading ? (
                <EmptyState text="Đang tải hàng chờ…" />
            ) : rooms.length === 0 && otherRooms.length === 0 ? (
                <div className="rounded-xl border border-border bg-canvas">
                    <EmptyState text="Chưa có bác sĩ nào trong ca và chưa có ai chờ. Khách đến không hẹn thì bấm Tiếp nhận khách vãng lai (F3)." />
                </div>
            ) : (
                <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}>
                    {rooms.map((room) => (
                        <RoomColumn
                            key={room.id}
                            room={room}
                            match={match}
                            now={now}
                            canMove={available.some((d) => d.id !== room.id)}
                            onOpen={(type, item) => setDialog({ type, item })}
                        />
                    ))}
                    {otherRooms.map((room) => (
                        <OtherRoomColumn key={room.key} room={room} match={match} />
                    ))}
                    <CounterColumn inService={inService} uninvoiced={data.uninvoiced} unpaid={data.unpaid} />
                </div>
            )}

            {dialog?.type === "walkIn" && (
                <WalkInDialog
                    doctors={available}
                    onClose={() => setDialog(null)}
                    onSubmit={(request) => act(createWalkIn(request), `Đã tiếp nhận ${request.fullName}.`)}
                />
            )}
            {dialog?.type === "priority" && (
                <PriorityDialog
                    entry={dialog.item}
                    onClose={() => setDialog(null)}
                    onSubmit={(v) => act(setPriority(dialog.item.appointmentId, v), `Đã đổi mức ưu tiên của ${dialog.item.patientName}.`)}
                />
            )}
            {dialog?.type === "noShow" && (
                <NoShowDialog
                    appointment={dialog.item}
                    onClose={() => setDialog(null)}
                    onSubmit={() => act(markNoShow(dialog.item.appointmentId), `Đã ghi ${dialog.item.patientName} không đến khám.`)}
                />
            )}
            {dialog?.type === "reassign" && (
                <ReassignDialog
                    item={dialog.item}
                    doctors={available.filter((d) => d.id !== dialog.item.doctorId)}
                    onClose={() => setDialog(null)}
                    onSubmit={(doctorId) => act(reassignDoctor(dialog.item.appointmentId, doctorId), `Đã chuyển ${dialog.item.patientName} sang bác sĩ khác.`)}
                />
            )}
            {dialog?.type === "moveAll" && (
                <ReassignDialog
                    item={{ patientName: `${dialog.item.rows.length} khách của ${dialog.item.name}` }}
                    // Doctors already working first: they can see the patients now
                    doctors={available
                        .filter((d) => d.id !== dialog.item.id)
                        .sort((a, b) => (a.status === "Working" ? -1 : 0) - (b.status === "Working" ? -1 : 0))}
                    onClose={() => setDialog(null)}
                    onSubmit={(doctorId) => moveAll(dialog.item, doctorId)}
                />
            )}
            {dialog?.type === "reschedule" && (
                <RescheduleDialog
                    appointment={dialog.item}
                    onClose={() => setDialog(null)}
                    onSubmit={(v) => act(rescheduleAppointment(dialog.item.id, v), `Đã đổi lịch của ${dialog.item.patientName}.`)}
                />
            )}
        </div>
    );
};

const QUEUE_TYPE_LABEL = { Imaging: "Chụp phim", Treatment: "Thủ thuật" };
const STATUS_ORDER = { IN_PROGRESS: 0, CALLED: 1, WAITING: 2 };
const QUEUE_STATUS = { IN_PROGRESS: ["Đang làm", "badge-info"], CALLED: ["Đã gọi", "badge-warning"], WAITING: ["Đang chờ", "badge-neutral"] };

// An X-ray or treatment room: read only, its technician calls people from their own screen.
// The receptionist sees it to tell a patient where they are and how long it may take.
const OtherRoomColumn = ({ room, match }) => {
    const entries = room.entries.filter((e) =>
        match({
            patientName: e.patientName,
            patientCode: e.patientCode,
            priority: e.priority,
            waited: e.status === "IN_PROGRESS" ? 0 : minutesSince(e.createdAt),
        }),
    );
    const waitingCount = room.entries.filter((e) => e.status !== "IN_PROGRESS").length;
    return (
        <section aria-label={room.name} className="overflow-hidden rounded-xl border border-border bg-canvas">
            <header className="flex items-start gap-3 bg-primary-soft px-4 py-3 text-ink">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-title font-semibold">{room.name}</p>
                    <p className="truncate text-caption text-muted">
                        {QUEUE_TYPE_LABEL[room.type] ?? room.type}
                        {room.staff ? `, ${room.staff}` : ""}. Kỹ thuật viên gọi người, quầy chỉ theo dõi.
                    </p>
                </div>
                <p className="num text-right font-heading text-[32px] leading-none font-bold text-primary" aria-label={`${waitingCount} người chờ`}>
                    {waitingCount}
                    <span className="block text-caption font-normal text-muted">đang chờ</span>
                </p>
            </header>
            {entries.length === 0 ? (
                <p className="px-4 py-6 text-center text-body-sm text-muted">Không ai khớp bộ lọc.</p>
            ) : (
                <ol className="divide-y divide-border">
                    {entries.map((e) => {
                        const waited = minutesSince(e.createdAt);
                        const [label, badge] = QUEUE_STATUS[e.status] ?? [e.status, "badge-neutral"];
                        return (
                            <li key={e.id} className={cx("flex items-start gap-3 px-4 py-3", e.status === "IN_PROGRESS" && "bg-primary-softer")}>
                                <span className="num grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted font-heading text-title font-bold text-ink">
                                    {e.queueNumber}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-ink">{e.patientName}</p>
                                    <p className="truncate text-caption text-muted">{e.patientCode}</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <span className={cx("badge", badge)}>{label}</span>
                                        {e.priority > PRIORITY.NORMAL && (
                                            <span className={cx("badge", PRIORITY_BADGE[e.priority])}>{PRIORITY_LABEL[e.priority]}</span>
                                        )}
                                    </div>
                                </div>
                                {e.status !== "IN_PROGRESS" && (
                                    <span className={cx("num shrink-0 rounded-full px-2 py-0.5 text-label font-semibold", WAIT_TONE_CLASS[waitTone(waited)])}>
                                        {waited} phút
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
};

// The last step of the visit: who is in a room now (comes to pay next), visits done without an invoice, invoices not paid yet
const CounterColumn = ({ inService, uninvoiced, unpaid }) => {
    const count = uninvoiced.length + unpaid.length;
    return (
        <section aria-label="Sắp ra quầy" className="overflow-hidden rounded-xl border border-border bg-canvas">
            <header className="flex items-start gap-3 bg-surface-muted px-4 py-3 text-ink">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-title font-semibold">Sắp ra quầy</p>
                    <p className="truncate text-caption text-muted">Khám xong thì lập hóa đơn và thu tiền.</p>
                </div>
                <p className="num text-right font-heading text-[32px] leading-none font-bold" aria-label={`${count} người chờ thanh toán`}>
                    {count}
                    <span className="block text-caption font-normal text-muted">chờ thu</span>
                </p>
            </header>
            {inService.length > 0 && (
                <div className="border-b border-border px-4 py-2.5 text-body-sm">
                    <span className="text-caption text-primary">Đang khám, sắp ra</span>
                    <ul className="mt-1 space-y-1">
                        {inService.map((a) => (
                            <li key={a.id} className="truncate">
                                <span className="font-semibold text-ink">{a.patientName}</span> <span className="text-caption text-muted">{a.doctorName}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {count === 0 ? (
                <p className="px-4 py-6 text-center text-body-sm text-muted">Không còn ai chờ thanh toán.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {uninvoiced.map((a) => (
                        <li key={`v${a.id}`} className="flex items-center gap-3 px-4 py-3 text-body-sm">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-ink">{a.patientName}</span>
                                <span className="block text-caption text-warning">Khám xong, chưa lập hóa đơn</span>
                            </span>
                            <Link to={ROUTES.RECEPTION_INVOICES} className="btn btn-primary h-8 text-caption">
                                Lập hóa đơn
                            </Link>
                        </li>
                    ))}
                    {unpaid.map((i) => (
                        <li key={`i${i.id}`} className="flex items-center gap-3 px-4 py-3 text-body-sm">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-ink">{i.patientName}</span>
                                <span className="num block text-caption text-muted">{money(i.remainingAmount)}</span>
                            </span>
                            <Link to={`${ROUTES.RECEPTION_INVOICES}?invoice=${i.id}`} className="btn btn-primary h-8 text-caption">
                                Thu tiền
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

// One doctor's room: who is inside, then the waiting order
const RoomColumn = ({ room, match, now, canMove, onOpen }) => {
    const rows = room.rows.filter(match);
    const ended = room.duty?.status === "Ended" || room.duty?.status === "OnLeave";
    const [dutyLabel, dutyTone] = dutyText(room.duty, now);
    // Waiting for a doctor who is not coming yet: say it, and offer to move the whole column
    const stuck = room.late > 0 && room.rows.length > 0;
    return (
        <section
            aria-label={`Phòng của ${room.name}`}
            className={cx("overflow-hidden rounded-xl border bg-canvas", ended || stuck ? "border-danger-solid/40" : "border-border")}
        >
            <header className="flex items-start gap-3 bg-surface-navy px-4 py-3 text-on-navy">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-title font-semibold">{room.name}</p>
                    <p className="truncate text-caption text-on-navy-soft">{[room.room, room.shift && `Ca ${room.shift}`].filter(Boolean).join(", ")}</p>
                    {dutyLabel && (
                        <span
                            className={cx(
                                "mt-1 inline-block rounded-full px-2 py-0.5 text-caption font-semibold",
                                dutyTone === "warning" ? "bg-warning-solid text-ink" : dutyTone === "success" ? "bg-success-solid text-white" : "bg-white/15",
                            )}
                        >
                            {dutyLabel}
                        </span>
                    )}
                </div>
                <p className="num text-right font-heading text-[32px] leading-none font-bold" aria-label={`${room.rows.length} người chờ`}>
                    {room.rows.length}
                    <span className="block text-caption font-normal text-on-navy-soft">đang chờ</span>
                </p>
            </header>

            {stuck && (
                <div className="flex flex-wrap items-center gap-2 border-b border-danger-solid/30 bg-danger-soft px-4 py-2.5 text-body-sm text-danger">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden />
                    <p className="min-w-0 flex-1">
                        {missedShift(room.duty, now)
                            ? `Bác sĩ không vào ca, ca đã hết lúc ${room.duty.end}. Chuyển khách sang bác sĩ khác hoặc đổi lịch.`
                            : `Bác sĩ chưa vào ca, trễ ${room.late} phút. Gọi bác sĩ hoặc chuyển khách sang người khác.`}
                    </p>
                    {canMove && (
                        <button type="button" className="btn btn-secondary h-8 text-caption" onClick={() => onOpen("moveAll", room)}>
                            <ArrowRightLeft className="size-3.5" aria-hidden /> Chuyển cả cột
                        </button>
                    )}
                </div>
            )}

            <div className={cx("border-b border-border px-4 py-2.5 text-body-sm", room.serving ? "bg-primary-softer" : "bg-surface-muted")}>
                {room.serving ? (
                    <>
                        <span className="text-caption text-primary">Trong phòng</span>
                        <span className="block font-semibold text-ink">
                            {room.serving.patientName} <span className="font-normal text-muted">{phoneTail(room.serving.patientPhoneNumber)}</span>
                        </span>
                        <span className="block truncate text-caption text-muted">{servicesOf(room.serving)}</span>
                    </>
                ) : (
                    <span className="text-muted">{room.notIn ? "Bác sĩ chưa vào phòng" : "Phòng đang trống"}</span>
                )}
            </div>

            {rows.length === 0 ? (
                <p className="px-4 py-6 text-center text-body-sm text-muted">{room.rows.length ? "Không ai khớp bộ lọc." : "Không có ai chờ."}</p>
            ) : (
                <ol className="divide-y divide-border">
                    {rows.map((w) => (
                        <li
                            key={w.appointmentId}
                            className={cx(
                                "border-l-4 px-4 py-3",
                                w.priority === PRIORITY.URGENT
                                    ? "border-l-danger-solid"
                                    : w.priority === PRIORITY.HIGH
                                      ? "border-l-warning-solid"
                                      : "border-l-transparent",
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <span className="num grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted font-heading text-title font-bold text-ink">
                                    {w.position}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-ink">{w.patientName}</p>
                                    <p className="truncate text-caption text-muted">
                                        {w.patientCode} {phoneTail(w.appointment?.patientPhoneNumber)}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {w.priority > PRIORITY.NORMAL && (
                                            <span className={cx("badge", PRIORITY_BADGE[w.priority])}>{PRIORITY_LABEL[w.priority]}</span>
                                        )}
                                        {w.isPriorityReturn && <span className="badge badge-info">Chụp phim xong</span>}
                                        {w.isLate && <span className="badge badge-warning">Đến trễ</span>}
                                        {!w.timeSlotStart && <span className="badge badge-neutral">Vãng lai</span>}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span
                                        className={cx(
                                            "num inline-block rounded-full px-2 py-0.5 text-label font-semibold",
                                            WAIT_TONE_CLASS[waitTone(w.waited)],
                                        )}
                                        title={`Check-in lúc ${clockOf(w.checkInAt)}`}
                                    >
                                        {w.waited} phút
                                    </span>
                                    <span className="block pt-1 text-caption text-muted">
                                        {w.eta === null
                                            ? stuck
                                                ? missedShift(room.duty, now)
                                                    ? "Cần chuyển bác sĩ"
                                                    : "Chờ bác sĩ vào ca"
                                                : "Chưa rõ giờ"
                                            : w.eta === 0
                                              ? "Đến lượt"
                                              : `~${w.eta} phút nữa`}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                                <button type="button" className="btn btn-secondary h-8 text-caption" onClick={() => onOpen("priority", w)}>
                                    Đổi ưu tiên
                                </button>
                                {!w.isPriorityReturn && (
                                    <button type="button" className="btn btn-link h-8 text-caption text-danger" onClick={() => onOpen("noShow", w)}>
                                        Không đến
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
};

export default ReceptionQueue;
