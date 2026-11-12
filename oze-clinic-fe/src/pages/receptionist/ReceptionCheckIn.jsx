import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import FilterSelect from "@/components/ui/FilterSelect";
import { WithQueuePanel } from "@/components/reception/QueueSidePanel";
import ReceptionAlerts from "@/components/reception/ReceptionAlerts";
import SearchInput from "@/components/ui/SearchInput";
import StatusTabs from "@/components/ui/StatusTabs";
import { countBy } from "@/utils/countBy";
import {
    Badge,
    CancelDialog,
    Card,
    CheckInDialog,
    ConfirmDialog,
    EmptyState,
    ErrorLine,
    FilterBar,
    NoShowDialog,
    PageHeader,
    RescheduleDialog,
    WalkInDialog,
} from "@/components/reception/shared";
import { STATUS_LABEL, phoneText, report, servicesOf, slotText, useDoctorsOnDuty, usePaging, weekdayDate } from "@/components/reception/receptionUtils";
import {
    cancelAppointment,
    checkInAppointment,
    clinicToday,
    confirmAppointment,
    createWalkIn,
    getTodayAppointments,
    markNoShow,
    rescheduleAppointment,
} from "@/services/receptionService";

// "Check-in hôm nay": every appointment of today. Check-in only for a CONFIRMED booking (BR-APT-05);
// a PENDING one is confirmed first after calling the patient. "Không đến" only for a checked-in patient who left.

// Booked patients still to come first, then the ones already in, then the closed ones
const ORDER = {
    CONFIRMED: 0,
    PENDING: 1,
    CHECKED_IN: 2,
    IN_SERVICE: 3,
    COMPLETED: 4,
    NO_SHOW: 5,
    CANCELLED: 6,
};
// In the order of the day: still to come first, finished and missed last
const STATUS_OPTIONS = Object.keys(ORDER).map((value) => ({ value, label: STATUS_LABEL[value][0], tone: STATUS_LABEL[value][1] }));

const matches = (a, keyword) => {
    const q = keyword.trim().toLowerCase();
    return !q || `${a.patientName} ${a.patientPhoneNumber} ${a.patientCode}`.toLowerCase().includes(q);
};

const ReceptionCheckIn = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [version, setVersion] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [filters, setFilters] = useState({
        keyword: "",
        slot: "",
        doctor: "",
        status: "",
    });
    const { doctors, available } = useDoctorsOnDuty(version);
    const endedDoctorIds = new Set(doctors.filter((d) => d.status === "Ended" || d.status === "OnLeave").map((d) => d.id));

    useEffect(() => {
        let active = true;
        getTodayAppointments().then((result) => {
            if (!active) return;
            setAppointments(result.success ? result.data.items : []);
            setLoadError(result.success ? null : result.message);
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const act = async (request, successText) => {
        if (report(await request, successText)) {
            setDialog(null);
            reload();
        }
    };

    const slotOptions = useMemo(() => [...new Set(appointments.map(slotText))].sort().map((value) => ({ value, label: value })), [appointments]);
    const doctorOptions = useMemo(
        () =>
            [...new Map(appointments.filter((a) => a.doctorId).map((a) => [String(a.doctorId), a.doctorName])).entries()].map(([value, label]) => ({
                value,
                label,
            })),
        [appointments],
    );

    // Search, time and doctor first: the status buttons count what is left
    const narrowed = appointments
        .filter((a) => matches(a, filters.keyword))
        .filter((a) => !filters.slot || slotText(a) === filters.slot)
        .filter((a) => !filters.doctor || String(a.doctorId) === filters.doctor);
    const counts = countBy(narrowed);
    const shown = narrowed
        .filter((a) => !filters.status || a.status === filters.status)
        .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.timeSlotStart ?? "99").localeCompare(b.timeSlotStart ?? "99"));
    const { pageItems, footer, setPage } = usePaging(shown, 10);
    const setFilter = (key) => (value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Check-in hôm nay" description={weekdayDate(clinicToday())}>
                <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: "walkIn" })} disabled={available.length === 0}>
                    <UserPlus className="size-4" aria-hidden /> Tiếp nhận bệnh nhân
                </button>
            </PageHeader>
            <ReceptionAlerts />
            <ErrorLine message={loadError} />

            <WithQueuePanel>
                <Card>
                    <FilterBar>
                        <SearchInput
                            id="ci-search"
                            label="Tìm bệnh nhân"
                            placeholder="Tên, số điện thoại hoặc mã bệnh nhân"
                            value={filters.keyword}
                            onChange={setFilter("keyword")}
                            className="min-w-64 flex-1"
                        />
                        <FilterSelect id="ci-slot" label="Ca" options={slotOptions} value={filters.slot} onChange={setFilter("slot")} allLabel="Tất cả giờ" />
                        <FilterSelect id="ci-doctor" label="Bác sĩ" options={doctorOptions} value={filters.doctor} onChange={setFilter("doctor")} />
                    </FilterBar>
                    <div className="px-5 pb-4">
                        <StatusTabs label="Trạng thái" options={STATUS_OPTIONS} value={filters.status} onChange={setFilter("status")} counts={counts} />
                    </div>
                    {loading ? (
                        <EmptyState text="Đang tải lịch hôm nay…" />
                    ) : shown.length === 0 ? (
                        <EmptyState
                            text={
                                appointments.length === 0
                                    ? "Hôm nay chưa có lịch hẹn. Khách đến không hẹn trước thì bấm Tiếp nhận bệnh nhân."
                                    : "Không có lịch nào khớp bộ lọc."
                            }
                        />
                    ) : (
                        <div className="table-wrap rounded-none border-x-0">
                            <table className="table table-stack">
                                <thead>
                                    <tr>
                                        <th>Ca</th>
                                        <th>Bệnh nhân</th>
                                        <th>Số điện thoại</th>
                                        <th>Bác sĩ chỉ định</th>
                                        <th>Dịch vụ</th>
                                        <th>Trạng thái</th>
                                        <th className="text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map((a) => (
                                        <tr key={a.id} className={["CANCELLED", "NO_SHOW"].includes(a.status) ? "opacity-60" : undefined}>
                                            <td data-label="Ca" className="num whitespace-nowrap">
                                                {slotText(a)}
                                            </td>
                                            <td data-primary>
                                                <div className="cell-primary">{a.patientName}</div>
                                                <div className="text-caption text-muted">{a.patientCode}</div>
                                            </td>
                                            <td data-label="Số điện thoại" className="num whitespace-nowrap">
                                                {phoneText(a.patientPhoneNumber)}
                                            </td>
                                            <td data-label="Bác sĩ">{a.doctorName ?? "Chưa gán"}</td>
                                            <td data-label="Dịch vụ" className="max-w-56">
                                                {servicesOf(a)}
                                            </td>
                                            <td data-label="Trạng thái">
                                                <Badge map={STATUS_LABEL} value={a.status} />
                                            </td>
                                            <td data-actions>
                                                <RowActions
                                                    appointment={a}
                                                    doctorEnded={endedDoctorIds.has(a.doctorId)}
                                                    onOpen={(type) => setDialog({ type, item: a })}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {footer}
                </Card>
            </WithQueuePanel>

            <AppointmentDialogs dialog={dialog} doctors={available} onClose={() => setDialog(null)} act={act} />
        </div>
    );
};

// Buttons a row offers, following the status rules of the backend
// doctorEnded: the doctor's shift today is over (or on leave), so check-in is refused; reschedule instead
export const RowActions = ({ appointment: a, onOpen, doctorEnded = false }) => {
    const open = ["PENDING", "CONFIRMED"].includes(a.status);
    const isToday = a.appointmentDate === clinicToday();
    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {a.status === "CONFIRMED" && isToday && !doctorEnded && (
                <button type="button" className="btn btn-primary h-9" onClick={() => onOpen("checkIn")}>
                    Check-in
                </button>
            )}
            {a.status === "CONFIRMED" && isToday && doctorEnded && <span className="text-caption text-warning">Bác sĩ đã hết ca, hãy đổi lịch</span>}
            {a.status === "PENDING" && (
                <button type="button" className="btn btn-secondary h-9" onClick={() => onOpen("confirm")}>
                    Xác nhận
                </button>
            )}
            {open && a.timeSlotStart && (
                <button type="button" className="btn btn-secondary h-9" onClick={() => onOpen("reschedule")}>
                    Đổi lịch
                </button>
            )}
            {open && (
                <button type="button" className="btn btn-link h-9 text-danger" onClick={() => onOpen("cancel")}>
                    Hủy lịch
                </button>
            )}
            {a.status === "CHECKED_IN" && (
                <button type="button" className="btn btn-secondary h-9" onClick={() => onOpen("noShow")}>
                    Không đến
                </button>
            )}
        </div>
    );
};

// The dialogs of an appointment row, plus walk-in
export const AppointmentDialogs = ({ dialog, doctors = [], onClose, act }) => {
    if (!dialog) return null;
    const a = dialog.item;
    switch (dialog.type) {
        case "confirm":
            return (
                <ConfirmDialog
                    appointment={a}
                    onClose={onClose}
                    onSubmit={() => act(confirmAppointment(a.id), `Đã xác nhận lịch của ${a.patientName}. Bệnh nhân nhận tin báo.`)}
                />
            );
        case "checkIn":
            return <CheckInDialog appointment={a} onClose={onClose} onSubmit={(v) => act(checkInAppointment(a.id, v), `Đã check-in ${a.patientName}.`)} />;
        case "cancel":
            return (
                <CancelDialog
                    appointment={a}
                    onClose={onClose}
                    onSubmit={(reason) => act(cancelAppointment(a.id, reason), `Đã hủy lịch của ${a.patientName}.`)}
                />
            );
        case "noShow":
            return <NoShowDialog appointment={a} onClose={onClose} onSubmit={() => act(markNoShow(a.id), `Đã ghi ${a.patientName} không đến khám.`)} />;
        case "reschedule":
            return (
                <RescheduleDialog
                    appointment={a}
                    onClose={onClose}
                    onSubmit={(v) => act(rescheduleAppointment(a.id, v), `Đã đổi lịch của ${a.patientName}.`)}
                />
            );
        case "walkIn":
            return <WalkInDialog doctors={doctors} onClose={onClose} onSubmit={(request) => act(createWalkIn(request), `Đã tiếp nhận ${request.fullName}.`)} />;
        default:
            return null;
    }
};

export default ReceptionCheckIn;
