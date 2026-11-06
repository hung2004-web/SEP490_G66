import { useRef } from "react";
import { Link } from "react-router-dom";
import AppointmentTabs from "@/components/appointment/AppointmentTabs";
import DentalChartPanel from "@/components/medicalRecord/DentalChartPanel";
import ExaminationList from "@/components/medicalRecord/ExaminationList";
import ExaminationSheet from "@/components/medicalRecord/ExaminationSheet";
import ImagingPanel from "@/components/medicalRecord/ImagingPanel";
import MedicalHistoryPanel from "@/components/medicalRecord/MedicalHistoryPanel";
import NextAppointmentBar from "@/components/medicalRecord/NextAppointmentBar";
import RecordEmptyCard from "@/components/medicalRecord/RecordEmptyCard";
import RecordStateBox from "@/components/medicalRecord/RecordStateBox";
import TreatmentPlanPanel from "@/components/medicalRecord/TreatmentPlanPanel";
import useMedicalRecordNavigation, { INITIAL_UI, focusElement, queryResetPatch } from "@/hooks/useMedicalRecordNavigation";
import {
    EMPTY_FILTERS,
    PAGE_STATE,
    RECORD_FILTER_BUTTON_ID,
    RECORD_ID_PREFIX,
    RECORD_PAGE_SIZE,
    RECORD_SEARCH_ID,
    RECORD_SORT_BUTTON_ID,
    RECORD_TITLE_ID,
    SHEET_TAB,
    chartOf,
    displayText,
    filterVisits,
    getCurrentPage,
    getFilterGroups,
    getSelection,
    getVisitNumbers,
    newestVisitId,
    nextSelection,
    resolveTooth,
    sortByDate,
    toToothCode,
} from "@/utils/medicalRecord";
import { MEDICAL_RECORD_TABS, ROUTES } from "@/utils/routes";

const TABS = [
    { key: SHEET_TAB, label: "Phiếu khám" },
    { key: MEDICAL_RECORD_TABS.PLAN, label: "Kế hoạch điều trị" },
    { key: MEDICAL_RECORD_TABS.FILM, label: "Phim và tài liệu" },
    { key: MEDICAL_RECORD_TABS.TEETH, label: "Sơ đồ răng" },
    { key: MEDICAL_RECORD_TABS.HIST, label: "Tiền sử" },
];

const PANELS = {
    [SHEET_TAB]: ({ data, visit }) => <ExaminationSheet visit={visit} clinic={data.clinic} profile={data.profile} patient={data.patient} />,
    [MEDICAL_RECORD_TABS.PLAN]: ({ data, visit, ui, urlVisitId, handlers }) => {
        const plan = data.plans.find((item) => item.id === visit.plan);
        if (!plan) return <RecordEmptyCard title="Phiếu này không thuộc kế hoạch điều trị nào" text="Buổi khám lẻ, không nằm trong kế hoạch nhiều bước." />;
        return (
            <TreatmentPlanPanel
                plan={plan}
                visitId={visit.id}
                visitIds={new Set(data.visits.map((item) => item.id))}
                urlVisitId={urlVisitId}
                drawerOpen={ui.drawerOpen}
                onOpenDrawer={handlers.openDrawer}
                onCloseDrawer={handlers.closeDrawer}
                onOpenVisit={handlers.openVisitFromLog}
                onToothLink={handlers.selectToothFromLink}
            />
        );
    },
    [MEDICAL_RECORD_TABS.FILM]: ({ data, visit }) => {
        const films = data.films.filter((film) => film.visit === visit.id && film.status === "concluded");
        if (!films.length) return <RecordEmptyCard title="Buổi này không chụp phim" text="Phim X-quang, ảnh chụp do bác sĩ chỉ định trong buổi khám sẽ hiện ở đây." />;
        return <ImagingPanel films={films} />;
    },
    [MEDICAL_RECORD_TABS.TEETH]: ({ data, visit, ui, handlers }) => {
        const entries = chartOf(data, visit.id);
        if (!entries.length) return <RecordEmptyCard title="Buổi này bác sĩ không ghi nhận răng nào" text="Các răng bác sĩ khám, điều trị trong buổi sẽ được tô trên sơ đồ." />;
        return <DentalChartPanel entries={entries} selectedTooth={ui.tooth} onSelectTooth={handlers.selectTooth} />;
    },
    [MEDICAL_RECORD_TABS.HIST]: ({ data, ui, handlers }) => <MedicalHistoryPanel history={data.history} collapsed={ui.collapsed} onToggle={handlers.toggleSection} />,
};

const LoadingSkeleton = () => (
    <div role="region" aria-busy="true" aria-label="Đang tải sổ khám bệnh">
        <div className="skeleton h-7 w-55" />
        <div className="skeleton mt-2.5 h-4 w-full max-w-105" />
        <div className="skeleton mt-5.5 h-13" />
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
            <div className="card-app flex flex-col gap-3 lg:w-80 lg:shrink-0">
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="skeleton h-3" />
                ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="card-app flex flex-col gap-3">
                    <div className="skeleton h-3 w-2/5" />
                    <div className="skeleton h-9" />
                </div>
                <div className="card-app flex flex-col gap-3">
                    {Array.from({ length: 9 }, (_, index) => (
                        <div key={index} className="skeleton h-3" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const MedicalRecord = () => {
    const { url, load, ui, setUi, page, list, pageState, h1Ref, retryRef, navigate, goTo, retry, ownState } = useMedicalRecordNavigation();
    const compositionVersion = useRef(null);
    const data = load.data;
    const groups = pageState === PAGE_STATE.CONTENT ? getFilterGroups(data) : [];
    const selectedId = pageState === PAGE_STATE.CONTENT ? getSelection(ui, list, page.target) : null;
    const currentPage = getCurrentPage(ui, list, selectedId);
    const newestId = data ? newestVisitId(data.visits) : null;

    const urlVisitId = url.hasId ? url.id : null;

    const applyListChange = (patch) => {
        const draft = { ...ui, ...patch };
        const nextList = filterVisits(data, draft, groups);
        const selection = nextSelection(ui, nextList, page.target, newestId, url.hasId);
        setUi({ ...patch, page: 1, selectionLost: selection.selectionLost, pageVisitId: selection.pageVisitId });
        if (selection.replaceId != null && selection.replaceId !== urlVisitId) goTo(selection.replaceId, url.tab, { replace: true });
    };

    const focusById = (id) => focusElement(document.getElementById(id));

    const handleSearchChange = (event) => {
        const value = event.target.value;
        if (event.nativeEvent.isComposing) {
            setUi({ searchInput: value });
            return;
        }
        applyListChange({ searchInput: value, keyword: value });
    };

    const handleCompositionStart = () => {
        compositionVersion.current = ui.queryVersion;
    };

    const handleCompositionEnd = (event) => {
        const queryKept = compositionVersion.current === ui.queryVersion;
        compositionVersion.current = null;
        if (queryKept) applyListChange({ searchInput: event.currentTarget.value, keyword: event.currentTarget.value });
        else setUi({ searchInput: ui.keyword });
    };

    const clearSearch = () => {
        applyListChange({ searchInput: "", keyword: "" });
        focusById(RECORD_SEARCH_ID);
    };

    const togglePopover = (key) => setUi({ popover: ui.popover === key ? null : key });

    const toggleFilter = (groupKey, value) => {
        const values = ui.filters[groupKey];
        const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
        applyListChange({ filters: { ...ui.filters, [groupKey]: next } });
    };

    const clearFilters = () => {
        applyListChange({ filters: EMPTY_FILTERS, popover: null });
        focusById(RECORD_FILTER_BUTTON_ID);
    };

    const closePopover = (openerId) => {
        setUi({ popover: null });
        focusById(openerId);
    };

    const dismissPopover = (byEscape) => {
        const openerId = ui.popover === "sort" ? RECORD_SORT_BUTTON_ID : RECORD_FILTER_BUTTON_ID;
        setUi({ popover: null });
        if (byEscape) focusById(openerId);
    };

    const selectSort = (sort) => {
        setUi({ sort, page: 1, pageVisitId: selectedId, popover: null });
        focusById(RECORD_SORT_BUTTON_ID);
    };

    const removeFilter = (groupKey, value, lastChip) => {
        applyListChange({ filters: { ...ui.filters, [groupKey]: ui.filters[groupKey].filter((item) => item !== value) } });
        if (lastChip) focusById(RECORD_SEARCH_ID);
    };

    const clearAll = () => {
        applyListChange({ searchInput: "", keyword: "", filters: EMPTY_FILTERS });
        focusById(RECORD_SEARCH_ID);
    };

    const selectVisit = (visitId) => {
        if (visitId === selectedId) return;
        setUi({ popover: null });
        goTo(visitId, url.tab);
    };

    const changePage = (next) => {
        const first = list[(next - 1) * RECORD_PAGE_SIZE];
        if (!first) return;
        setUi({ page: next, pageVisitId: first.id, popover: null });
        if (url.hasId ? first.id === urlVisitId : first.id === newestId) return;
        goTo(first.id, url.tab, { replace: true });
    };

    const selectTab = (tab) => {
        setUi({ popover: null });
        if (tab !== url.tab) goTo(urlVisitId, tab, { replace: true });
    };

    const openVisitFromLog = () => setUi({ ...queryResetPatch(ui), popover: null });

    const selectToothFromLink = (tooth) => {
        const code = toToothCode(tooth);
        setUi(code == null ? { popover: null } : { tooth: code, popover: null });
    };

    const openDrawer = (event) => {
        focusElement(event.currentTarget);
        setUi({ drawerOpen: true, popover: null });
    };

    const closeDrawer = () => setUi({ drawerOpen: false });

    const toggleSection = (key) => setUi((current) => ({ collapsed: { ...current.collapsed, [key]: !current.collapsed[key] } }));

    const selectTooth = (tooth) => {
        if (tooth != null) setUi({ tooth });
    };

    const backToList = () => {
        setUi({ ...INITIAL_UI, queryVersion: ui.queryVersion + 1 });
        navigate(ROUTES.MEDICAL_RECORD, { replace: true, state: { ...ownState, focusH1: true } });
    };

    if (pageState === PAGE_STATE.LOADING) return <LoadingSkeleton />;

    const header = (
        <div className="page-header">
            <div>
                <h1 id={RECORD_TITLE_ID} ref={h1Ref} tabIndex={-1} className="page-title outline-none focus-visible:shadow-none">
                    Sổ khám bệnh
                </h1>
                <p className="page-description">Hồ sơ điều trị của bạn tại phòng khám: từng phiếu khám, kế hoạch, phim chụp, tình trạng răng và tiền sử.</p>
            </div>
        </div>
    );

    if (pageState === PAGE_STATE.ERROR) {
        return (
            <>
                {header}
                <RecordStateBox
                    title="Không thể tải sổ khám bệnh"
                    text="Đã có lỗi xảy ra, vui lòng thử lại."
                    actionLabel="Thử lại"
                    onAction={retry}
                    buttonRef={retryRef}
                />
            </>
        );
    }

    if (pageState === PAGE_STATE.NOT_FOUND) {
        return (
            <>
                {header}
                <RecordStateBox
                    title="Không tìm thấy phiếu khám"
                    text="Phiếu khám không tồn tại hoặc bạn không có quyền xem."
                    actionLabel="Về danh sách phiếu khám"
                    onAction={backToList}
                />
            </>
        );
    }

    if (pageState === PAGE_STATE.NEW_PATIENT) {
        return (
            <>
                {header}
                <RecordEmptyCard
                    title="Sổ khám bệnh đang trống"
                    text="Sau lần khám đầu tiên, phiếu khám, kế hoạch điều trị, đơn thuốc và phim chụp sẽ được lưu ở đây."
                >
                    <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-primary mt-3 h-8 px-3">
                        Gửi yêu cầu hẹn
                    </Link>
                </RecordEmptyCard>
            </>
        );
    }

    const tab = url.tab;
    const selectedVisit = data.visits.find((visit) => visit.id === selectedId) ?? null;
    const numbers = getVisitNumbers(data.visits);
    if (tab === MEDICAL_RECORD_TABS.TEETH && selectedVisit) {
        const effectiveTooth = resolveTooth(chartOf(data, selectedVisit.id), ui.tooth);
        if (!Object.is(effectiveTooth, ui.tooth)) setUi({ tooth: effectiveTooth });
    }
    const nextAppointment = sortByDate(data.upcoming, (appointment) => appointment.date, 1)[0] ?? null;
    const handlers = { openVisitFromLog, selectToothFromLink, openDrawer, closeDrawer, selectTooth, toggleSection };
    const panelContext = { data, visit: selectedVisit, ui, urlVisitId, handlers };

    return (
        <>
            {header}
            <div className="card-app mb-4 px-4 py-1">
                <AppointmentTabs tabs={TABS} selected={tab} onSelect={selectTab} labelledBy={RECORD_TITLE_ID} idPrefix={RECORD_ID_PREFIX} />
            </div>
            <div id={`${RECORD_ID_PREFIX}-panel`} role="tabpanel" aria-labelledby={`${RECORD_ID_PREFIX}-tab-${tab}`}>
                <NextAppointmentBar appointment={nextAppointment} />
                {tab === MEDICAL_RECORD_TABS.HIST ? (
                    PANELS[tab](panelContext)
                ) : (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                        <ExaminationList
                            total={data.visits.length}
                            list={list}
                            page={currentPage}
                            selectedId={selectedId}
                            numbers={numbers}
                            ui={ui}
                            groups={groups}
                            onSearchChange={handleSearchChange}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={handleCompositionEnd}
                            onClearSearch={clearSearch}
                            onTogglePopover={togglePopover}
                            onToggleFilter={toggleFilter}
                            onClearFilters={clearFilters}
                            onDoneFilters={() => closePopover(RECORD_FILTER_BUTTON_ID)}
                            onDismissPopover={dismissPopover}
                            onSelectSort={selectSort}
                            onRemoveFilter={removeFilter}
                            onClearAll={clearAll}
                            onSelectVisit={selectVisit}
                            onPageChange={changePage}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-4">
                            {selectedVisit ? (
                                <>
                                    <section className="card-app px-5 py-4">
                                        <h2 className="font-heading text-heading-3 text-ink">
                                            Phiếu khám #{numbers.get(selectedVisit.id)} · {displayText(selectedVisit.wd)} {displayText(selectedVisit.date)}
                                        </h2>
                                        <p className="text-caption text-muted">
                                            {displayText(selectedVisit.service)} · {displayText(selectedVisit.doctor)}
                                        </p>
                                    </section>
                                    {PANELS[tab](panelContext)}
                                </>
                            ) : (
                                <RecordEmptyCard
                                    title="Không có phiếu khám để hiển thị"
                                    text="Không phiếu nào khớp với tìm kiếm hoặc bộ lọc. Xóa tìm kiếm để xem lại các phiếu khám."
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default MedicalRecord;
