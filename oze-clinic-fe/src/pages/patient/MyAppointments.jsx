import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, CalendarDays, Funnel, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import AppointmentTable from "@/components/appointment/AppointmentTable";
import { FilterPopover } from "@/components/medicalRecord/ExaminationFilterPopover";
import Pagination from "@/components/ui/Pagination";
import useAsync from "@/hooks/useAsync";
import { getMyAppointments } from "@/services/patientDashboardService";
import { APPOINTMENT_STATUS, GENERIC_ERROR_MESSAGE, PATIENT_APPOINTMENT_STATUS } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const ID_PREFIX = "my-appointments";
const TITLE_ID = `${ID_PREFIX}-title`;
const SEARCH_ID = `${ID_PREFIX}-search`;
const FILTER_BUTTON_ID = `${ID_PREFIX}-filter-button`;
const FILTER_PANEL_ID = `${ID_PREFIX}-filter-panel`;
const SORT_ID = `${ID_PREFIX}-sort`;
const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;
const SEARCH_FIELDS = ["appointmentCode", "serviceName", "doctorName"];

const STATUS_ORDER = [
    APPOINTMENT_STATUS.PENDING,
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.IN_SERVICE,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
];

const TEXT = {
    STATUS: "Trạng thái",
    FILTER_LABEL: "Lọc theo trạng thái",
    CLEAR_SELECTION: "Bỏ chọn tất cả",
    CLEAR_FILTERS: "Xóa bộ lọc",
    REMOVE_FILTER: (label) => `Bỏ lọc ${label}`,
    SORT_LABEL: "Sắp xếp theo ngày khám",
    NO_MATCH_TITLE: "Không có lịch hẹn phù hợp",
    NO_MATCH_TEXT: "Thử bỏ bớt trạng thái đang lọc hoặc đổi từ khóa.",
    RESET_ALL: "Xóa tìm kiếm và bộ lọc",
};

const SORT = { NEWEST: "newest", OLDEST: "oldest" };

const SORT_OPTIONS = [
    { value: SORT.NEWEST, label: "Ngày khám: mới nhất trước" },
    { value: SORT.OLDEST, label: "Ngày khám: cũ nhất trước" },
];

const CHIP_CLASS = "inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-caption text-primary";

const statusLabel = (status) => PATIENT_APPOINTMENT_STATUS[status].label;

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

const matchesStatus = (statuses, appointment) => statuses.length === 0 || statuses.includes(appointment.status);

const dateOf = (appointment) => String(appointment.appointmentDate ?? "").slice(0, 10);

const timeOf = (appointment) => String(appointment.timeSlotStart ?? "");

const compareNewestFirst = (a, b) => dateOf(b).localeCompare(dateOf(a)) || timeOf(b).localeCompare(timeOf(a)) || b.id - a.id;

const COMPARERS = { [SORT.NEWEST]: compareNewestFirst, [SORT.OLDEST]: (a, b) => compareNewestFirst(b, a) };

const focusById = (id) => document.getElementById(id)?.focus();

const MyAppointments = () => {
    const resource = toResource(useAsync(getMyAppointments, []));
    const [statuses, setStatuses] = useState([]);
    const [sort, setSort] = useState(SORT.NEWEST);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const resultsRef = useRef(null);

    const moveFocusIntoResults = () => {
        const results = resultsRef.current;
        const active = document.activeElement;
        if (results && active !== results && results.contains(active)) results.focus();
    };

    useEffect(() => {
        const next = normalizeText(searchInput);
        if (next === keyword) return undefined;
        const timer = setTimeout(() => {
            setKeyword(next);
            setPage(1);
            moveFocusIntoResults();
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [searchInput, keyword]);

    const ready = !resource.loading && !resource.failed;
    const statusCounts = Object.fromEntries(STATUS_ORDER.map((status) => [status, resource.data.filter((item) => item.status === status).length]));
    const rows = resource.data.filter((appointment) => matchesStatus(statuses, appointment) && matchesKeyword(appointment, keyword)).sort(COMPARERS[sort]);
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const from = (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(currentPage * PAGE_SIZE, total);
    const filterGroups = [
        { key: "status", title: TEXT.STATUS, options: STATUS_ORDER.map((status) => ({ value: status, label: statusLabel(status), count: statusCounts[status] })) },
    ];

    const applyStatuses = (next) => {
        setStatuses(next);
        setKeyword(normalizeText(searchInput));
        setPage(1);
    };

    const toggleStatus = (_group, status) =>
        applyStatuses(statuses.includes(status) ? statuses.filter((item) => item !== status) : STATUS_ORDER.filter((item) => item === status || statuses.includes(item)));

    const closeFilter = (returnFocus) => {
        setFilterOpen(false);
        if (returnFocus) focusById(FILTER_BUTTON_ID);
    };

    const removeStatus = (status) => {
        applyStatuses(statuses.filter((item) => item !== status));
        focusById(FILTER_BUTTON_ID);
    };

    const clearFilters = () => {
        applyStatuses([]);
        focusById(FILTER_BUTTON_ID);
    };

    const resetAll = () => {
        setStatuses([]);
        setSearchInput("");
        setKeyword("");
        setPage(1);
        focusById(SEARCH_ID);
    };

    const changeSort = (event) => {
        setSort(event.target.value);
        setKeyword(normalizeText(searchInput));
        setPage(1);
    };

    const handlePageChange = (next) => {
        const pending = normalizeText(searchInput);
        if (pending !== keyword) {
            setKeyword(pending);
            setPage(1);
            moveFocusIntoResults();
            return;
        }
        if (next === currentPage) return;
        setPage(next);
        resultsRef.current?.focus();
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
            {resource.loading && <AppointmentTable loading labelledBy={TITLE_ID} />}
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
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="search min-w-0 flex-1 basis-64 md:max-w-lg">
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
                            <div className="relative">
                                <button
                                    id={FILTER_BUTTON_ID}
                                    type="button"
                                    data-record-popover-opener=""
                                    className="btn btn-secondary"
                                    aria-expanded={filterOpen}
                                    aria-controls={FILTER_PANEL_ID}
                                    onClick={() => setFilterOpen((open) => !open)}
                                >
                                    <Funnel aria-hidden="true" className="size-4" />
                                    {TEXT.STATUS}
                                    {statuses.length > 0 && (
                                        <span className="num rounded-full bg-primary px-2 text-caption text-on-primary">
                                            <span className="sr-only">, đã chọn </span>
                                            {statuses.length}
                                        </span>
                                    )}
                                </button>
                                {filterOpen && (
                                    <FilterPopover
                                        id={FILTER_PANEL_ID}
                                        groups={filterGroups}
                                        filters={{ status: statuses }}
                                        openerId={FILTER_BUTTON_ID}
                                        label={TEXT.FILTER_LABEL}
                                        clearLabel={TEXT.CLEAR_SELECTION}
                                        dimEmpty={false}
                                        className="w-72"
                                        titleClassName="text-muted"
                                        onToggle={toggleStatus}
                                        onClear={() => applyStatuses([])}
                                        onDone={() => closeFilter(true)}
                                        onDismiss={closeFilter}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <ArrowUpDown aria-hidden="true" className="size-4 text-muted" />
                                <label htmlFor={SORT_ID} className="sr-only">
                                    {TEXT.SORT_LABEL}
                                </label>
                                <select id={SORT_ID} className="input w-auto" value={sort} onChange={changeSort}>
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {statuses.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                {statuses.map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        className={CHIP_CLASS}
                                        aria-label={TEXT.REMOVE_FILTER(statusLabel(status))}
                                        onClick={() => removeStatus(status)}
                                    >
                                        {statusLabel(status)}
                                        <X aria-hidden="true" className="size-3" />
                                    </button>
                                ))}
                                <button type="button" className="btn btn-link text-caption" onClick={clearFilters}>
                                    {TEXT.CLEAR_FILTERS}
                                </button>
                            </div>
                        )}
                    </div>
                    <div ref={resultsRef} tabIndex={-1} className="mt-4">
                        {total === 0 ? (
                            <div className="card-app empty-state py-24">
                                <span aria-hidden="true" className="mb-3 flex size-14 items-center justify-center rounded-full bg-surface-tint text-muted">
                                    <Search className="size-6" />
                                </span>
                                <p className="empty-state-title">{TEXT.NO_MATCH_TITLE}</p>
                                <p className="empty-state-text">{TEXT.NO_MATCH_TEXT}</p>
                                <button type="button" className="btn btn-secondary mt-4 min-h-11 md:min-h-0" onClick={resetAll}>
                                    {TEXT.RESET_ALL}
                                </button>
                            </div>
                        ) : (
                            <>
                                <AppointmentTable appointments={pageRows} labelledBy={TITLE_ID} />
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
                    </div>
                </>
            )}
        </>
    );
};

export default MyAppointments;
