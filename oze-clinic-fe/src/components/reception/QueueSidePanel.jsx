import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight } from "lucide-react";
import useMediaQuery from "@/hooks/useMediaQuery";
import { clockOf, hhmm } from "./receptionUtils";
import { PRIORITY, getTodayAppointments, getWaitingList } from "@/services/receptionService";
import { ROUTES } from "@/utils/routes";
import { cx } from "@/utils/cx";

// The waiting list beside the work area, like the reception design: 300px wide, or folded to a 72px strip of
// numbers to give the page more room. The choice is remembered on this computer. Read-only; it refreshes itself.

const STORAGE_KEY = "oze.reception.queuePanelCollapsed";

const readCollapsed = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
};

const saveCollapsed = (value) => {
    try {
        localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
        // Storage blocked (private window): the panel just opens again next time
    }
};

const load = async () => {
    const [waiting, today] = await Promise.all([getWaitingList(), getTodayAppointments()]);
    return {
        waiting: waiting.success ? waiting.data : [],
        serving: today.success ? today.data.items.filter((a) => a.status === "IN_SERVICE") : [],
    };
};

// Wraps a page: queue panel on the left, the page on the right. Below 1024px the panel sits above the page instead,
// and folding it leaves a one-line bar (a strip of numbers only makes sense as a side column).
export const WithQueuePanel = ({ children }) => {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const wide = useMediaQuery("(min-width: 64rem)");
    const toggle = () => {
        setCollapsed((current) => {
            saveCollapsed(!current);
            return !current;
        });
    };
    return (
        <div
            className={cx(
                "grid items-start gap-5",
                collapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]",
            )}
        >
            <QueueSidePanel collapsed={collapsed} wide={wide} onToggle={toggle} />
            <div className="min-w-0">{children}</div>
        </div>
    );
};

const QueueSidePanel = ({ collapsed: folded, wide, onToggle }) => {
    // Side strip of numbers on a wide screen; on a narrow one, folded means only the title bar
    const collapsed = folded && wide;
    const hidden = folded && !wide;
    const [data, setData] = useState({ waiting: [], serving: [] });

    useEffect(() => {
        let active = true;
        const refresh = () => load().then((next) => active && setData(next));
        refresh();
        const timer = setInterval(refresh, 30_000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, []);

    // One section per doctor: who is in the room, then the waiting order of the backend
    const doctors = [...new Map([...data.serving, ...data.waiting].filter((x) => x.doctorId).map((x) => [x.doctorId, x])).values()].map((x) => ({
        id: x.doctorId,
        name: x.doctorName,
        room: x.roomName,
        serving: data.serving.find((a) => a.doctorId === x.doctorId),
        waiting: data.waiting.filter((w) => w.doctorId === x.doctorId),
    }));
    const total = data.waiting.length;

    return (
        <aside
            aria-label="Hàng chờ"
            className="overflow-hidden rounded-xl border border-border bg-canvas lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col"
        >
            <div className={cx("flex items-center gap-2 border-b border-border", collapsed ? "justify-center px-2 py-3" : "px-4 py-3")}>
                {!collapsed && (
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">Hàng chờ</p>
                        <p className="text-caption text-muted">{total} người đang chờ</p>
                    </div>
                )}
                <button
                    type="button"
                    className="btn btn-secondary btn-icon h-9 w-9"
                    onClick={onToggle}
                    aria-expanded={!folded}
                    aria-label={folded ? "Mở rộng hàng chờ" : "Thu gọn hàng chờ"}
                    title={folded ? "Mở rộng hàng chờ" : "Thu gọn hàng chờ"}
                >
                    {wide ? (
                        folded ? (
                            <ChevronsRight className="size-4" aria-hidden />
                        ) : (
                            <ChevronsLeft className="size-4" aria-hidden />
                        )
                    ) : folded ? (
                        <ChevronDown className="size-4" aria-hidden />
                    ) : (
                        <ChevronUp className="size-4" aria-hidden />
                    )}
                </button>
            </div>

            {!hidden && (
                <div className="max-h-80 overflow-y-auto lg:max-h-none">
                    {doctors.length === 0
                        ? !collapsed && <p className="px-4 py-6 text-center text-body-sm text-muted">Chưa có ai trong hàng chờ.</p>
                        : doctors.map((doctor) => (
                              <section key={doctor.id} className="border-b border-border last:border-0">
                                  <h3
                                      className={cx(
                                          "flex items-center justify-between text-caption font-semibold text-muted",
                                          collapsed ? "justify-center px-1 pt-3 pb-1" : "px-4 pt-3 pb-1",
                                      )}
                                      title={doctor.name}
                                  >
                                      {collapsed ? (
                                          <span className="num">{doctor.waiting.length}</span>
                                      ) : (
                                          <>
                                              <span className="truncate">
                                                  {doctor.name}
                                                  {doctor.room ? ` · ${doctor.room}` : ""}
                                              </span>
                                              <span className="num">{doctor.waiting.length}</span>
                                          </>
                                      )}
                                  </h3>
                                  {doctor.serving && <Row collapsed={collapsed} number="•" active name={doctor.serving.patientName} detail="Đang khám" />}
                                  {doctor.waiting.map((w) => (
                                      <Row
                                          key={w.appointmentId}
                                          collapsed={collapsed}
                                          number={w.position}
                                          name={w.patientName}
                                          detail={`${w.timeSlotStart ? `hẹn ${hhmm(w.timeSlotStart)}` : "vãng lai"} · check-in ${clockOf(w.checkInAt) ?? ""}`}
                                          priority={w.priority}
                                          returned={w.isPriorityReturn}
                                      />
                                  ))}
                              </section>
                          ))}
                </div>
            )}

            {!collapsed && !hidden && (
                <Link
                    to={ROUTES.RECEPTION_QUEUE}
                    className="border-t border-border px-4 py-3 text-center text-label font-semibold text-primary hover:underline"
                >
                    Mở trang Hàng chờ
                </Link>
            )}
        </aside>
    );
};

const Row = ({ collapsed, number, name, detail, active, priority = PRIORITY.NORMAL, returned }) => (
    <div
        className={cx(
            "flex items-start gap-3 border-l-[3px]",
            collapsed ? "justify-center px-0 py-2" : "px-4 py-2",
            active ? "border-l-primary bg-primary-softer" : priority > PRIORITY.NORMAL ? "border-l-warning" : "border-l-transparent",
        )}
        title={collapsed ? `${name} · ${detail}` : undefined}
    >
        <span
            className={cx(
                "num grid size-8 shrink-0 place-items-center rounded-lg text-label font-bold",
                active
                    ? "bg-primary text-on-primary"
                    : priority === PRIORITY.URGENT
                      ? "bg-danger-soft text-danger"
                      : priority === PRIORITY.HIGH
                        ? "bg-warning-soft text-warning"
                        : "bg-surface-muted text-ink",
            )}
        >
            {number}
        </span>
        {!collapsed && (
            <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-semibold text-ink">{name}</span>
                <span className="block truncate text-caption text-muted">{detail}</span>
                {(priority > PRIORITY.NORMAL || returned) && (
                    <span className="mt-1 flex flex-wrap gap-1">
                        {priority === PRIORITY.URGENT && <span className="badge badge-danger">Khẩn</span>}
                        {priority === PRIORITY.HIGH && <span className="badge badge-warning">Ưu tiên</span>}
                        {returned && <span className="badge badge-info">Chụp phim xong</span>}
                    </span>
                )}
            </span>
        )}
    </div>
);
