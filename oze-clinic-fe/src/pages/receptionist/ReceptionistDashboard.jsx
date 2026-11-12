import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReceptionAlerts from "@/components/reception/ReceptionAlerts";
import MyShiftBar from "@/components/staff/MyShiftBar";
import { Card } from "@/components/reception/shared";
import {
    BOOKING_DAYS_AHEAD,
    STATUS_LABEL,
    clinicClock,
    ddmm,
    dutyText,
    hhmm,
    isPendingSoon,
    minutesSince,
    money,
    phoneTail,
    servicesOf,
    toMinutes,
    useDoctorsOnDuty,
    weekdayDate,
} from "@/components/reception/receptionUtils";
import { getCurrentCashSession } from "@/services/cashSessionService";
import {
    clinicToday,
    getAppointments,
    getOpenInvoices,
    getPaymentHistory,
    getRecentInvoices,
    getTodayAppointments,
    getWaitingList,
} from "@/services/receptionService";
import { getSessionUserName } from "@/services/sessionStore";
import { ROUTES } from "@/utils/routes";
import { cx } from "@/utils/cx";

// "Tổng quan": only the main things, each one opening the page where the work is done.
// 1) the state of the counter (cash drawer, doctors) and alerts; 2) the work waiting now, as numbers;
// 3) today in figures; 4) who comes to the counter next; 5) today hour by hour.
// Lists, actions and revenue charts live on their own pages (Check-in, Xác nhận, Hàng chờ, Thu tiền, Hóa đơn).

const fetchOverview = async () => {
    const [today, pending, waiting, open, completed, recent, transfers, paidToday, cash] = await Promise.all([
        getTodayAppointments(),
        getAppointments({ fromDate: clinicToday(), toDate: clinicToday(BOOKING_DAYS_AHEAD), status: "PENDING" }),
        getWaitingList(),
        getOpenInvoices(),
        getAppointments({ fromDate: clinicToday(-7), toDate: clinicToday(), status: "COMPLETED" }),
        getRecentInvoices(),
        getPaymentHistory({ status: "PENDING", pageSize: 50 }),
        getPaymentHistory({ status: "CONFIRMED", fromDate: clinicToday(), toDate: clinicToday(), pageSize: 1 }),
        getCurrentCashSession(),
    ]);
    const failed = [today, pending, waiting, open].find((r) => !r.success);
    const invoiced = new Set((recent.data?.items ?? []).filter((i) => i.paymentStatus !== "CANCELLED" && i.appointmentId).map((i) => i.appointmentId));
    const now = clinicClock();
    return {
        error: failed?.message ?? null,
        today: today.data?.items ?? [],
        pending: (pending.data?.items ?? []).map((a) => ({ ...a, soon: isPendingSoon(a, clinicToday(), now) })),
        waiting: waiting.data ?? [],
        open: open.data?.items ?? [],
        uninvoiced: (completed.data?.items ?? []).filter((a) => !invoiced.has(a.id)),
        transfers: transfers.data?.items ?? [],
        paid: paidToday.success ? paidToday.data.confirmedCash + paidToday.data.confirmedTransfer : 0,
        cash: cash.success ? cash.data : null,
    };
};

const ReceptionistDashboard = () => {
    const [data, setData] = useState({
        loading: true,
        today: [],
        pending: [],
        waiting: [],
        open: [],
        uninvoiced: [],
        transfers: [],
        paid: 0,
        cash: null,
        error: null,
        round: 0,
    });
    // Doctors start and end their shifts during the day: reload them with every refresh
    const { doctors } = useDoctorsOnDuty(data.round);

    useEffect(() => {
        let active = true;
        // Refresh in place every 30 seconds; nothing flashes "loading" again
        const load = () => fetchOverview().then((next) => active && setData((prev) => ({ loading: false, ...next, round: prev.round + 1 })));
        load();
        const timer = setInterval(load, 30_000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, []);

    const toCheckIn = data.today.filter((a) => a.status === "CONFIRMED").sort((a, b) => (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""));
    const pendingToday = data.pending.filter((a) => a.appointmentDate === clinicToday());
    const inService = data.today.filter((a) => a.status === "IN_SERVICE");
    const oldTransfers = data.transfers.filter((p) => minutesSince(p.createdAt) > 30);
    const openTotal = data.open.reduce((sum, i) => sum + Number(i.remainingAmount), 0);
    const firstName = (getSessionUserName() ?? "").trim().split(" ").at(-1);

    // The work waiting now: each number opens the page that clears it
    const tiles = [
        {
            label: "Chờ xác nhận",
            count: data.pending.length,
            hint: pendingToday.length ? `${pendingToday.length} lịch hôm nay` : "Gọi khách xác nhận",
            to: ROUTES.RECEPTION_APPOINTMENTS,
            urgent: data.pending.some((a) => a.soon),
        },
        {
            label: "Chờ check-in",
            count: toCheckIn.length,
            hint: toCheckIn[0] ? `Kế tiếp ${hhmm(toCheckIn[0].timeSlotStart)}` : "Không còn ai",
            to: ROUTES.RECEPTION_CHECK_IN,
        },
        {
            label: "Đang chờ khám",
            count: data.waiting.length,
            hint: inService.length ? `${inService.length} đang trong phòng` : "Phòng đang trống",
            to: ROUTES.RECEPTION_QUEUE,
        },
        {
            label: "Chưa lập hóa đơn",
            count: data.uninvoiced.length,
            hint: "Khám xong, chưa có hóa đơn",
            to: ROUTES.RECEPTION_INVOICES,
            urgent: data.uninvoiced.length > 0,
        },
        { label: "Chờ thu tiền", count: data.open.length, hint: data.open.length ? money(openTotal) : "Đã thu hết", to: ROUTES.RECEPTION_INVOICES },
        {
            label: "Chuyển khoản chờ",
            count: data.transfers.length,
            hint: oldTransfers.length ? `${oldTransfers.length} khoản chờ quá 30 phút` : "Kiểm tra tài khoản",
            to: ROUTES.RECEPTION_INVOICE_LIST,
            urgent: oldTransfers.length > 0,
        },
    ];

    // Counter problems only this page knows about, added to the "Cần xử lý ngay" list
    const counterAlerts = data.loading
        ? []
        : [
              !data.cash && {
                  key: "cash",
                  tone: "warning",
                  text: "Chưa mở két hôm nay. Mở két với số tiền đầu ca trước khi thu tiền mặt.",
                  to: ROUTES.RECEPTION_CASH_HANDOVER,
                  action: "Mở két",
              },
              oldTransfers.length > 0 && {
                  key: "transfers",
                  tone: "warning",
                  text: `${oldTransfers.length} khoản chuyển khoản chờ xác nhận quá 30 phút. Kiểm tra tài khoản rồi xác nhận hoặc từ chối.`,
                  to: ROUTES.RECEPTION_INVOICE_LIST,
                  action: "Kiểm tra",
              },
          ].filter(Boolean);

    // Today in figures
    const countOf = (statuses) => data.today.filter((a) => statuses.includes(a.status)).length;
    const figures = [
        { label: "Lịch hẹn hôm nay", value: data.today.length, to: ROUTES.RECEPTION_SCHEDULE },
        { label: "Đã khám xong", value: countOf(["COMPLETED"]), to: ROUTES.RECEPTION_CHECK_IN },
        { label: "Không đến hoặc hủy", value: countOf(["NO_SHOW", "CANCELLED"]), to: ROUTES.RECEPTION_CHECK_IN },
        { label: "Đã thu hôm nay", value: money(data.paid), to: ROUTES.RECEPTION_INVOICE_LIST },
    ];

    return (
        <div className="app-content min-h-full">
            <header className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="mr-auto">
                    <h1 className="page-title">{firstName ? `Chào ${firstName}` : "Tổng quan"}</h1>
                    <p className="page-description first-letter:uppercase">{weekdayDate(clinicToday())}</p>
                </div>
                <CounterStatus cash={data.cash} doctors={doctors} loading={data.loading} />
            </header>

            {/* The receptionist clocks in here: the counter they work at, then the queue */}
            <MyShiftBar queueTo={ROUTES.RECEPTION_QUEUE} queueLabel="Mở hàng chờ" />
            <ReceptionAlerts extra={counterAlerts} showAllClear={!data.loading} />
            {data.error && (
                <p role="alert" className="mb-4 rounded-lg border border-danger-solid/40 bg-danger-soft px-4 py-3 text-body-sm text-danger">
                    Không tải được dữ liệu: {data.error}
                </p>
            )}

            <nav
                aria-label="Việc đang chờ"
                className="mb-5 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-canvas sm:grid-cols-3 2xl:grid-cols-6"
            >
                {tiles.map((t) => (
                    <Link
                        key={t.label}
                        to={t.to}
                        className={cx(
                            "group relative border-b border-r border-border px-5 py-4 transition-colors hover:bg-primary-softer focus-visible:z-10",
                            t.count === 0 && "opacity-60",
                        )}
                    >
                        {t.urgent && t.count > 0 && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-warning-solid" />}
                        <span className="block text-body-sm font-medium text-muted group-hover:text-primary">{t.label}</span>
                        <span
                            className={cx(
                                "num block font-heading text-[40px] leading-tight font-bold",
                                t.count === 0 ? "text-muted" : t.urgent ? "text-warning" : "text-ink",
                            )}
                        >
                            {data.loading ? "–" : t.count}
                        </span>
                        <span className="block truncate text-caption text-muted">{t.hint}</span>
                    </Link>
                ))}
            </nav>

            <dl className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {figures.map((f) => (
                    <Link key={f.label} to={f.to} className="rounded-xl border border-border bg-canvas px-5 py-3 hover:border-primary">
                        <dt className="text-caption text-muted">{f.label}</dt>
                        <dd className="num m-0 font-heading text-heading-3 font-bold text-ink">{data.loading ? "–" : f.value}</dd>
                    </Link>
                ))}
            </dl>

            <div className="grid items-start gap-5 xl:grid-cols-2">
                <CounterFlow inService={inService} uninvoiced={data.uninvoiced} open={data.open} loading={data.loading} />
                <TodayTimeline appointments={data.today} />
            </div>
        </div>
    );
};

// The state of the counter at a glance: the cash drawer and each doctor on shift today
const CounterStatus = ({ cash, doctors, loading }) => {
    if (loading) return null;
    const dot = { success: "bg-success-solid", warning: "bg-warning-solid", neutral: "bg-border-strong" };
    return (
        <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <Link
                to={ROUTES.RECEPTION_CASH_HANDOVER}
                className={cx(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
                    cash ? "border-border bg-canvas text-ink" : "border-warning/60 bg-warning-soft text-warning",
                )}
            >
                {cash ? (
                    <>
                        Két đang mở <span className="num font-semibold">{money(cash.expectedCash)}</span>
                    </>
                ) : (
                    "Chưa mở két, bấm để mở"
                )}
            </Link>
            {doctors.map((d) => {
                const [label, tone] = dutyText(d);
                return (
                    <span
                        key={d.id}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-ink",
                            tone === "warning" ? "border-warning/60 bg-warning-soft" : "border-border bg-canvas",
                        )}
                        title={`${d.room ?? ""} ca ${d.shift}`}
                    >
                        <i aria-hidden className={cx("size-2 rounded-full", dot[tone])} />
                        {d.name} <span className={tone === "warning" ? "font-semibold text-warning" : "text-muted"}>{label}</span>
                    </span>
                );
            })}
        </div>
    );
};

// The way to the counter: people in the room now will come to pay; visits done without an invoice must not leave unbilled
const CounterFlow = ({ inService, uninvoiced, open, loading }) => {
    const todayOpen = open.filter((i) => i.createdAt && new Date(i.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }) === clinicToday());
    return (
        <Card title="Ra quầy">
            <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="p-4">
                    <h3 className="mb-2 text-label text-muted">Đang khám, sắp ra quầy ({inService.length})</h3>
                    {loading ? null : inService.length === 0 ? (
                        <p className="text-body-sm text-muted">Chưa có ai trong phòng khám.</p>
                    ) : (
                        <ul className="space-y-2">
                            {inService.map((a) => (
                                <li key={a.id} className="rounded-lg bg-primary-softer px-3 py-2 text-body-sm">
                                    <span className="font-semibold text-ink">{a.patientName}</span>{" "}
                                    <span className="text-muted">{phoneTail(a.patientPhoneNumber)}</span>
                                    <span className="block text-caption text-muted">
                                        {a.doctorName} · {servicesOf(a)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="p-4">
                    <h3 className="mb-2 text-label text-muted">Chờ thanh toán hôm nay ({uninvoiced.length + todayOpen.length})</h3>
                    {loading ? null : uninvoiced.length + todayOpen.length === 0 ? (
                        <p className="text-body-sm text-muted">Không còn ai chờ thanh toán.</p>
                    ) : (
                        <ul className="space-y-2">
                            {uninvoiced.map((a) => (
                                <li key={`v${a.id}`} className="flex items-center gap-3 rounded-lg border border-warning/50 px-3 py-2 text-body-sm">
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold text-ink">{a.patientName}</span>
                                        <span className="block text-caption text-warning">Khám xong {ddmm(a.appointmentDate)}, chưa lập hóa đơn</span>
                                    </span>
                                    <Link to={ROUTES.RECEPTION_INVOICES} className="btn btn-primary h-9">
                                        Lập hóa đơn
                                    </Link>
                                </li>
                            ))}
                            {todayOpen.map((i) => (
                                <li key={`i${i.id}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-body-sm">
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold text-ink">{i.patientName}</span>
                                        <span className="block text-caption text-muted">{i.invoiceNumber}</span>
                                    </span>
                                    <span className="num font-semibold text-ink">{money(i.remainingAmount)}</span>
                                    <Link to={`${ROUTES.RECEPTION_INVOICES}?invoice=${i.id}`} className="btn btn-primary h-9">
                                        Thu tiền
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Card>
    );
};

const DOT = {
    PENDING: "bg-warning-solid",
    CONFIRMED: "bg-success-solid",
    CHECKED_IN: "bg-primary",
    IN_SERVICE: "bg-primary",
    COMPLETED: "bg-success",
    NO_SHOW: "bg-danger-solid",
    CANCELLED: "bg-border-strong",
};

// Today on one line: each booking is a dot at its time, the blue line is now. Bunches show the rush hours;
// a booked dot left of "now" is someone late.
const TodayTimeline = ({ appointments }) => {
    const booked = appointments.filter((a) => a.timeSlotStart && a.status !== "CANCELLED");
    const now = toMinutes(clinicClock());
    const [start, end] = useMemo(() => {
        const times = booked.map((a) => toMinutes(a.timeSlotStart));
        return [Math.min(7 * 60, ...times), Math.max(21 * 60, ...times.map((t) => t + 30))];
    }, [booked]);
    const pos = (minutes) => `${((minutes - start) / (end - start)) * 100}%`;
    const hours = [];
    for (let h = Math.ceil(start / 60); h * 60 <= end; h += 2) hours.push(h);

    return (
        <Card title="Hôm nay theo giờ">
            <div className="px-5 pt-6 pb-3">
                <div className="relative h-10">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
                    {hours.map((h) => (
                        <span key={h} className="num absolute top-full -translate-x-1/2 pt-1 text-caption text-muted" style={{ left: pos(h * 60) }}>
                            {h}h
                        </span>
                    ))}
                    {booked.map((a, i) => (
                        <span
                            key={a.id}
                            title={`${hhmm(a.timeSlotStart)} ${a.patientName}: ${STATUS_LABEL[a.status]?.[0] ?? a.status}`}
                            className={cx("absolute size-3 -translate-x-1/2 rounded-full ring-2 ring-canvas", DOT[a.status])}
                            style={{ left: pos(toMinutes(a.timeSlotStart)), top: `${8 + (i % 3) * 8}px` }}
                        />
                    ))}
                    {now >= start && now <= end && (
                        <span className="absolute -top-3 bottom-0 w-0.5 bg-primary" style={{ left: pos(now) }}>
                            <span className="absolute -top-4 -translate-x-1/2 rounded bg-primary px-1 text-caption text-on-primary">Bây giờ</span>
                        </span>
                    )}
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-5 py-3 text-caption text-muted">
                {Object.entries(DOT)
                    .filter(([s]) => s !== "CANCELLED")
                    .map(([s, cls]) => (
                        <span key={s} className="inline-flex items-center gap-1.5">
                            <i aria-hidden className={cx("size-2 rounded-full", cls)} />
                            {STATUS_LABEL[s][0]}
                        </span>
                    ))}{" "}
            </div>
        </Card>
    );
};

export default ReceptionistDashboard;
