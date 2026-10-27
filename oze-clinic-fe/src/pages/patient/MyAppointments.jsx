import { useEffect, useRef, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Pagination from "@/components/ui/Pagination";
import useAsync from "@/hooks/useAsync";
import { getMyAppointments } from "@/services/patientDashboardService";
import { APPOINTMENT_STATUS, GENERIC_ERROR_MESSAGE } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";
import AppointmentTable from "./appointments/AppointmentTable";
import AppointmentTabs from "./appointments/AppointmentTabs";

const ID_PREFIX = "my-appointments";
const TITLE_ID = `${ID_PREFIX}-title`;
const PANEL_ID = `${ID_PREFIX}-panel`;
const SEARCH_ID = `${ID_PREFIX}-search`;
const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;
const SEARCH_FIELDS = ["appointmentCode", "serviceName", "doctorName"];

const TABS = [
    { key: "all", label: "Tất cả", statuses: null },
    {
        key: "upcoming",
        label: "Sắp tới",
        statuses: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_SERVICE],
    },
    { key: "done", label: "Đã khám", statuses: [APPOINTMENT_STATUS.COMPLETED] },
    { key: "missed", label: "Đã hủy / Lỡ hẹn", statuses: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] },
];

const tabId = (key) => `${ID_PREFIX}-tab-${key}`;

const toResource = ({ loading, error, value }) => {
    const failed = !loading && (Boolean(error) || value?.success === false || !Array.isArray(value?.data));
    return { loading, failed, data: !loading && !failed ? value.data.filter((item) => item !== null && typeof item === "object") : [] };
};

const normalizeText = (value) =>
    String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();

const matchesKeyword = (appointment, keyword) => !keyword || SEARCH_FIELDS.some((field) => normalizeText(appointment[field]).includes(keyword));

const inTab = (tab, appointment) => !tab.statuses || tab.statuses.includes(appointment.status);

const dateOf = (appointment) => String(appointment.appointmentDate ?? "").slice(0, 10);

const timeOf = (appointment) => String(appointment.timeSlotStart ?? "");

const compareNewestFirst = (a, b) => dateOf(b).localeCompare(dateOf(a)) || timeOf(b).localeCompare(timeOf(a)) || b.id - a.id;

const MyAppointments = () => {
    const resource = toResource(useAsync(getMyAppointments, []));
    const [tab, setTab] = useState(TABS[0].key);
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const panelRef = useRef(null);

    const moveFocusIntoPanel = () => {
        const panel = panelRef.current;
        const active = document.activeElement;
        if (panel && active !== panel && panel.contains(active) && active.id !== SEARCH_ID) panel.focus();
    };

    useEffect(() => {
        const next = normalizeText(searchInput);
        if (next === keyword) return undefined;
        const timer = setTimeout(() => {
            setKeyword(next);
            setPage(1);
            moveFocusIntoPanel();
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [searchInput, keyword]);

    const ready = !resource.loading && !resource.failed;
    const tabs = TABS.map((item) => ({
        key: item.key,
        label: item.label,
        count: ready ? resource.data.filter((appointment) => inTab(item, appointment)).length : null,
    }));
    const activeTab = TABS.find((item) => item.key === tab);
    const rows = resource.data.filter((appointment) => inTab(activeTab, appointment) && matchesKeyword(appointment, keyword)).sort(compareNewestFirst);
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const from = (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(currentPage * PAGE_SIZE, total);
    const panelTabIndex = resource.loading || resource.failed ? 0 : -1;
    const tableLabel = `${TITLE_ID} ${tabId(tab)}`;

    const selectTab = (key) => {
        if (key === tab) return;
        setTab(key);
        setKeyword(normalizeText(searchInput));
        setPage(1);
    };

    const handlePageChange = (next) => {
        const pending = normalizeText(searchInput);
        if (pending !== keyword) {
            setKeyword(pending);
            setPage(1);
            moveFocusIntoPanel();
            return;
        }
        if (next === currentPage) return;
        setPage(next);
        panelRef.current?.focus();
    };

    return (
        <>
            <div className="page-header">
                <h1 id={TITLE_ID} className="page-title">
                    Lịch hẹn của tôi
                </h1>
                <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-primary min-h-11 md:min-h-0">
                    Đặt lịch hẹn
                </Link>
            </div>
            <AppointmentTabs tabs={tabs} selected={tab} onSelect={selectTab} labelledBy={TITLE_ID} idPrefix={ID_PREFIX} />
            <div id={PANEL_ID} ref={panelRef} role="tabpanel" aria-labelledby={tabId(tab)} tabIndex={panelTabIndex} className="mt-6">
                {resource.loading && <AppointmentTable loading labelledBy={tableLabel} />}
                {resource.failed && (
                    <div role="alert" className="alert alert-danger">
                        {GENERIC_ERROR_MESSAGE}
                    </div>
                )}
                {ready && resource.data.length === 0 && (
                    <div className="card-app empty-state py-24">
                        <span aria-hidden="true" className="mb-3 flex size-14 items-center justify-center rounded-full bg-surface-tint text-muted">
                            <CalendarDays className="size-6" />
                        </span>
                        <p className="empty-state-title">Bạn chưa có lịch hẹn nào.</p>
                        <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-secondary mt-4 min-h-11 md:min-h-0">
                            Đặt lịch hẹn
                        </Link>
                    </div>
                )}
                {ready && resource.data.length > 0 && (
                    <>
                        <div className="search mb-6 w-full md:max-w-lg">
                            <Search aria-hidden="true" />
                            <label htmlFor={SEARCH_ID} className="sr-only">
                                Tìm lịch hẹn
                            </label>
                            <input
                                id={SEARCH_ID}
                                type="search"
                                className="input"
                                placeholder="Tìm theo mã lịch, dịch vụ, bác sĩ"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                            />
                        </div>
                        {total === 0 ? (
                            <div className="card-app empty-state py-24">
                                <span aria-hidden="true" className="mb-3 flex size-14 items-center justify-center rounded-full bg-surface-tint text-muted">
                                    <Search className="size-6" />
                                </span>
                                <p className="empty-state-text">Không tìm thấy lịch hẹn phù hợp.</p>
                            </div>
                        ) : (
                            <>
                                <AppointmentTable appointments={pageRows} labelledBy={tableLabel} />
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <p className="num text-caption text-muted">
                                        Hiển thị {from}–{to} trong {total} lịch hẹn
                                    </p>
                                    <div className="-m-1 max-w-full overflow-x-auto p-1">
                                        <Pagination page={currentPage} totalPages={totalPages} onChange={handlePageChange} label="Phân trang danh sách lịch hẹn" />
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default MyAppointments;
