import { useCallback, useEffect, useMemo, useState } from "react";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import StatusTabs from "@/components/ui/StatusTabs";
import { countBy } from "@/utils/countBy";
import { Badge, Card, EmptyState, ErrorLine, FilterBar, PageHeader } from "@/components/reception/shared";
import {
    BOOKING_DAYS_AHEAD,
    STATUS_LABEL,
    clinicClock,
    ddmm,
    isPendingSoon,
    phoneText,
    report,
    servicesOf,
    slotText,
    usePaging,
} from "@/components/reception/receptionUtils";
import { clinicToday, getAppointments } from "@/services/receptionService";
import { AppointmentDialogs, RowActions } from "./ReceptionCheckIn";

// "Xác nhận lịch hẹn": bookings made online wait as PENDING until the receptionist calls the patient and confirms.
// A pending booking keeps its slot. No call log yet (F-APT-11 is still a proposal), so the outcome is confirm, reschedule or cancel.

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "CANCELLED"].map((value) => ({ value, label: STATUS_LABEL[value][0], tone: STATUS_LABEL[value][1] }));

const ReceptionConfirm = () => {
    const [range, setRange] = useState({ from: clinicToday(), to: clinicToday(BOOKING_DAYS_AHEAD) });
    const [filters, setFilters] = useState({ keyword: "", status: "PENDING", doctor: "", slot: "" });
    const [state, setState] = useState({ loading: true, items: [], error: null });
    const [version, setVersion] = useState(0);
    const [dialog, setDialog] = useState(null);

    useEffect(() => {
        let active = true;
        getAppointments({ fromDate: range.from, toDate: range.to }).then((result) => {
            if (!active) return;
            setState({ loading: false, items: result.success ? result.data.items : [], error: result.success ? null : result.message });
        });
        return () => {
            active = false;
        };
    }, [range, version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const act = async (request, successText) => {
        if (report(await request, successText)) {
            setDialog(null);
            reload();
        }
    };

    const doctorOptions = useMemo(
        () =>
            [...new Map(state.items.filter((a) => a.doctorId).map((a) => [String(a.doctorId), a.doctorName])).entries()].map(([value, label]) => ({
                value,
                label,
            })),
        [state.items],
    );
    const slotOptions = useMemo(() => [...new Set(state.items.map(slotText))].sort().map((value) => ({ value, label: value })), [state.items]);

    const q = filters.keyword.trim().toLowerCase();
    // Search, doctor and time first: the status buttons count what is left
    const narrowed = state.items
        .filter((a) => !q || `${a.patientName} ${a.patientPhoneNumber} ${a.patientCode}`.toLowerCase().includes(q))
        .filter((a) => !filters.doctor || String(a.doctorId) === filters.doctor)
        .filter((a) => !filters.slot || slotText(a) === filters.slot);
    const counts = countBy(narrowed);
    const shown = narrowed
        .filter((a) => !filters.status || a.status === filters.status)
        .map((a) => ({ ...a, soon: isPendingSoon(a, clinicToday(), clinicClock()) }))
        .sort(
            (a, b) =>
                Number(b.soon) - Number(a.soon) ||
                a.appointmentDate.localeCompare(b.appointmentDate) ||
                (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
        );
    const { pageItems, footer, setPage } = usePaging(shown, 10);
    const setFilter = (key) => (value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Xác nhận lịch hẹn" description="Gọi điện cho bệnh nhân rồi xác nhận, đổi lịch hoặc hủy. Lịch chưa xác nhận vẫn giữ chỗ." />
            <ErrorLine message={state.error} />

            <Card>
                <FilterBar>
                    <SearchInput
                        id="cf-search"
                        label="Tìm bệnh nhân"
                        placeholder="Tên, số điện thoại hoặc mã bệnh nhân"
                        value={filters.keyword}
                        onChange={setFilter("keyword")}
                        className="min-w-64 flex-1"
                    />
                    <label className="flex items-center gap-2 text-body-sm text-muted">
                        Từ
                        <input
                            type="date"
                            className="input w-auto"
                            value={range.from}
                            onChange={(e) => e.target.value && setRange((r) => ({ from: e.target.value, to: r.to < e.target.value ? e.target.value : r.to }))}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-body-sm text-muted">
                        đến
                        <input
                            type="date"
                            className="input w-auto"
                            min={range.from}
                            value={range.to}
                            onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
                        />
                    </label>
                    <FilterSelect id="cf-slot" label="Ca" options={slotOptions} value={filters.slot} onChange={setFilter("slot")} allLabel="Tất cả giờ" />
                    <FilterSelect id="cf-doctor" label="Bác sĩ" options={doctorOptions} value={filters.doctor} onChange={setFilter("doctor")} />
                </FilterBar>
                <div className="px-5 pb-4">
                    <StatusTabs label="Trạng thái" options={STATUS_OPTIONS} value={filters.status} onChange={setFilter("status")} counts={counts} />
                </div>
                {state.loading ? (
                    <EmptyState text="Đang tải lịch hẹn…" />
                ) : shown.length === 0 ? (
                    <EmptyState
                        text={
                            filters.status === "PENDING"
                                ? "Không còn lịch nào chờ xác nhận trong khoảng ngày này. Lịch đặt được trước tối đa 30 ngày."
                                : "Không có lịch nào khớp bộ lọc."
                        }
                    />
                ) : (
                    <div className="table-wrap rounded-none border-x-0">
                        <table className="table table-stack">
                            <thead>
                                <tr>
                                    <th>Ngày hẹn</th>
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
                                    <tr key={a.id} className={a.status === "CANCELLED" ? "opacity-60" : undefined}>
                                        <td data-label="Ngày hẹn" className="num whitespace-nowrap">
                                            {a.appointmentDate === clinicToday() ? "Hôm nay" : ddmm(a.appointmentDate)}
                                        </td>
                                        <td data-label="Ca" className="num whitespace-nowrap">
                                            {slotText(a)}
                                        </td>
                                        <td data-primary>
                                            <div className="cell-primary">{a.patientName}</div>
                                            <div className="text-caption text-muted">{a.patientCode}</div>
                                        </td>
                                        <td data-label="Số điện thoại" className="num whitespace-nowrap">
                                            <a className="btn-link" href={`tel:${a.patientPhoneNumber}`}>
                                                {phoneText(a.patientPhoneNumber)}
                                            </a>
                                        </td>
                                        <td data-label="Bác sĩ">{a.doctorName ?? "Chưa gán"}</td>
                                        <td data-label="Dịch vụ" className="max-w-56">
                                            {servicesOf(a)}
                                        </td>
                                        <td data-label="Trạng thái">
                                            <div className="flex flex-wrap gap-1">
                                                <Badge map={STATUS_LABEL} value={a.status} />
                                                {a.soon && <span className="badge badge-danger">Sắp đến giờ, gọi ngay</span>}
                                            </div>
                                        </td>
                                        <td data-actions>
                                            <RowActions appointment={a} onOpen={(type) => setDialog({ type, item: a })} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {footer}
            </Card>

            <AppointmentDialogs dialog={dialog} onClose={() => setDialog(null)} act={act} />
        </div>
    );
};

export default ReceptionConfirm;
