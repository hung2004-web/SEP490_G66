import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import FilterSelect from "@/components/ui/FilterSelect";
import BookingDialog from "@/components/reception/BookingDialog";
import { Badge, Card, EmptyState, ErrorLine, PageHeader } from "@/components/reception/shared";
import { STATUS_LABEL, clinicClock, phoneText, report, servicesOf, slotText } from "@/components/reception/receptionUtils";
import { clinicToday, getAppointments } from "@/services/receptionService";
import { cx } from "@/utils/cx";
import { AppointmentDialogs, RowActions } from "./ReceptionCheckIn";

// "Quản lý lịch hẹn": the week at a glance. Each cell is one half hour of one day and shows how many bookings it has
// per status. Click a cell to see and act on its bookings; click an empty future cell to book for a patient (F-APT-09).

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
// Order and colour of the counts in a cell
const CELL_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "NO_SHOW", "CANCELLED"];
const DOT = {
    PENDING: "bg-warning-solid",
    CONFIRMED: "bg-success-solid",
    CHECKED_IN: "bg-primary",
    IN_SERVICE: "bg-primary",
    COMPLETED: "bg-success",
    NO_SHOW: "bg-danger-solid",
    CANCELLED: "bg-border-strong",
};

const addDays = (date, days) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const mondayOf = (date) => {
    const [y, m, d] = date.split("-").map(Number);
    return addDays(date, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
};
const ddmm = (date) => date.split("-").reverse().slice(0, 2).join("/");
const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const fromMinutes = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
// The half hour a time falls in
const rowOf = (time) => fromMinutes(Math.floor(toMinutes(time) / 30) * 30);

const ReceptionSchedule = () => {
    const today = clinicToday();
    const [weekStart, setWeekStart] = useState(() => mondayOf(today));
    const [doctor, setDoctor] = useState("");
    const [state, setState] = useState({ loading: true, items: [], error: null });
    const [version, setVersion] = useState(0);
    const [cell, setCell] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [booking, setBooking] = useState(null);

    useEffect(() => {
        let active = true;
        getAppointments({ fromDate: weekStart, toDate: addDays(weekStart, 6), doctorId: doctor }).then(
            (result) => active && setState({ loading: false, items: result.success ? result.data.items : [], error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [weekStart, doctor, version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const act = async (request, successText) => {
        if (report(await request, successText)) {
            setDialog(null);
            reload();
        }
    };

    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const booked = state.items.filter((a) => a.timeSlotStart);
    const walkIns = state.items.filter((a) => !a.timeSlotStart);

    // Rows from 08:00 to 17:30, widened to any booking outside that
    const rows = useMemo(() => {
        const minutes = booked.map((a) => toMinutes(rowOf(a.timeSlotStart)));
        const first = Math.min(8 * 60, ...minutes);
        const last = Math.max(17 * 60 + 30, ...minutes);
        return Array.from({ length: (last - first) / 30 + 1 }, (_, i) => fromMinutes(first + i * 30));
    }, [booked]);

    const doctorOptions = useMemo(
        () => [...new Map(state.items.filter((a) => a.doctorId).map((a) => [String(a.doctorId), a.doctorName])).entries()].map(([value, label]) => ({ value, label })),
        [state.items],
    );
    const inCell = (day, row) => booked.filter((a) => a.appointmentDate === day && rowOf(a.timeSlotStart) === row);
    const isPast = (day, row) => day < today || (day === today && row < clinicClock());

    const cellItems = cell ? (cell.row ? inCell(cell.day, cell.row) : walkIns.filter((a) => a.appointmentDate === cell.day)) : [];

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Quản lý lịch hẹn" description="Bấm một ô để xem lịch hẹn của khung giờ đó. Bấm ô trống còn trước mắt để đặt lịch hộ bệnh nhân.">
                <button type="button" className="btn btn-primary" onClick={() => setBooking({})}>
                    <CalendarPlus className="size-4" aria-hidden /> Đặt lịch hộ
                </button>
            </PageHeader>
            <ErrorLine message={state.error} />

            <Card>
                <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                    <button type="button" className="btn btn-secondary btn-icon" aria-label="Tuần trước" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                        <ChevronLeft className="size-4" aria-hidden />
                    </button>
                    <p className="num min-w-40 text-center text-label text-ink">{ddmm(weekStart)} – {ddmm(addDays(weekStart, 6))}</p>
                    <button type="button" className="btn btn-secondary btn-icon" aria-label="Tuần sau" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                        <ChevronRight className="size-4" aria-hidden />
                    </button>
                    {weekStart !== mondayOf(today) && <button type="button" className="btn btn-link" onClick={() => setWeekStart(mondayOf(today))}>Tuần này</button>}
                    <span className="flex-1" />
                    <FilterSelect id="sch-doctor" label="Bác sĩ" options={doctorOptions} value={doctor} onChange={setDoctor} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-5 py-2 text-caption text-muted">
                    {CELL_STATUSES.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5"><i aria-hidden className={cx("size-2 rounded-full", DOT[s])} />{STATUS_LABEL[s][0]}</span>
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
                                        {walkIns.some((a) => a.appointmentDate === day) && (
                                            <button type="button" className="ml-1 text-primary underline" onClick={() => setCell({ day, row: null })}>
                                                +{walkIns.filter((a) => a.appointmentDate === day).length} vãng lai
                                            </button>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row} className="border-t border-border">
                                    <th scope="row" className="num px-2 py-1 text-left font-medium text-muted">{row}</th>
                                    {days.map((day) => {
                                        const items = inCell(day, row);
                                        const past = isPast(day, row);
                                        const counts = CELL_STATUSES.map((s) => [s, items.filter((a) => a.status === s).length]).filter(([, n]) => n > 0);
                                        return (
                                            <td key={day} className={cx("h-12 border-l border-border p-0.5 align-top", day === today && "bg-primary-softer", past && "bg-surface-muted/50")}>
                                                {items.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCell({ day, row })}
                                                        className="flex h-full w-full flex-col gap-0.5 rounded-md px-1.5 py-1 text-left hover:bg-primary-soft"
                                                        aria-label={`${ddmm(day)} ${row}: ${items.length} lịch hẹn`}
                                                    >
                                                        {counts.map(([s, n]) => (
                                                            <span key={s} className="flex items-center gap-1 text-ink">
                                                                <i aria-hidden className={cx("size-2 shrink-0 rounded-full", DOT[s])} />
                                                                <span className="num">{n}</span>
                                                                <span className="truncate text-muted">{STATUS_LABEL[s][0].toLowerCase()}</span>
                                                            </span>
                                                        ))}
                                                    </button>
                                                ) : !past ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setBooking({ date: day })}
                                                        className="grid h-full w-full place-items-center rounded-md text-transparent hover:bg-primary-soft hover:text-primary"
                                                        aria-label={`Đặt lịch ngày ${ddmm(day)} lúc ${row}`}
                                                    >
                                                        +
                                                    </button>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {cell && (
                <Drawer
                    title={cell.row ? `${ddmm(cell.day)} · ${cell.row}` : `${ddmm(cell.day)} · khách vãng lai`}
                    description={`${cellItems.length} lịch hẹn`}
                    onClose={() => setCell(null)}
                >
                    {cellItems.length === 0 ? (
                        <EmptyState text="Không còn lịch hẹn nào trong khung giờ này." />
                    ) : (
                        <ul className="space-y-3">
                            {cellItems.map((a) => (
                                <li key={a.id} className="rounded-lg border border-border p-3">
                                    <div className="flex flex-wrap items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-ink">{a.patientName}</p>
                                            <p className="text-caption text-muted">{a.patientCode} · {phoneText(a.patientPhoneNumber)}</p>
                                        </div>
                                        <Badge map={STATUS_LABEL} value={a.status} />
                                    </div>
                                    <p className="mt-2 text-body-sm text-ink">{slotText(a)} · {a.doctorName ?? "Chưa gán bác sĩ"}</p>
                                    <p className="text-caption text-muted">{servicesOf(a)}</p>
                                    <div className="mt-2">
                                        <RowActions appointment={a} onOpen={(type) => setDialog({ type, item: a })} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Drawer>
            )}

            <AppointmentDialogs dialog={dialog} onClose={() => setDialog(null)} act={act} />
            {booking && (
                <BookingDialog
                    initial={booking}
                    onClose={() => setBooking(null)}
                    onBooked={(a) => {
                        report({ success: true }, `Đã đặt lịch cho ${a.patientName} lúc ${slotText(a)} ngày ${ddmm(a.appointmentDate)}.`);
                        setBooking(null);
                        setWeekStart(mondayOf(a.appointmentDate));
                        reload();
                    }}
                />
            )}
        </div>
    );
};

export default ReceptionSchedule;
