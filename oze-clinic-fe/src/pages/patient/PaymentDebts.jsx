import { useRef } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Search, Wallet } from "lucide-react";
import StatusDefinitionDrawer from "@/components/medicalRecord/StatusDefinitionDrawer";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import PatientDebtOverview from "@/components/patientDebt/PatientDebtOverview";
import PatientDebtPayments from "@/components/patientDebt/PatientDebtPayments";
import PatientDebtRefunds from "@/components/patientDebt/PatientDebtRefunds";
import PatientDebtSchedule from "@/components/patientDebt/PatientDebtSchedule";
import PatientDebtTable from "@/components/patientDebt/PatientDebtTable";
import PatientDebtToolbar from "@/components/patientDebt/PatientDebtToolbar";
import usePatientDebtNavigation from "@/hooks/usePatientDebtNavigation";
import { cx } from "@/utils/cx";
import { isPlainClick } from "@/utils/medicalRecord";
import { PATIENT_DEBT_STATUS_GUIDE, PATIENT_DEBT_TEXT } from "@/utils/messages";
import {
    DEBT_FILTER_BUTTON_ID,
    DEBT_NAV_FLAG,
    DEBT_RETRY_ID,
    DEBT_SEARCH_ID,
    DEBT_SORT_BUTTON_ID,
    DEBT_TITLE_ID,
    countByStatus,
    countByType,
    inType,
    sortDebts,
} from "@/utils/patientDebt";
import { ROUTES } from "@/utils/routes";

const BACK_STATE = { [DEBT_NAV_FLAG]: true };
const TITLE_CLASS = "page-title outline-none focus-visible:shadow-none";

const focusById = (id) => document.getElementById(id)?.focus({ preventScroll: true });

const StateBox = ({ icon: Icon, title, text, children }) => (
    <section className="card-app p-0">
        <div className="empty-state">
            <Icon className="empty-state-icon" aria-hidden="true" />
            <h2 className="empty-state-title">{title}</h2>
            <p className="empty-state-text">{text}</p>
            {children}
        </div>
    </section>
);

const ListSkeleton = () => (
    <section className="card-app px-5 py-4" aria-busy="true" aria-label={PATIENT_DEBT_TEXT.LOADING_LIST}>
        <div className="skeleton h-8 w-3/5" />
        <div className="skeleton mt-3 h-10" />
        {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="skeleton mt-2.5 h-11" />
        ))}
    </section>
);

const DetailSkeleton = () => (
    <div aria-busy="true" aria-label={PATIENT_DEBT_TEXT.LOADING_DETAIL}>
        <section className="card-app px-5 py-5">
            <div className="skeleton h-7 w-1/2" />
            <div className="skeleton mt-3 h-16" />
        </section>
        <div className="mt-4 grid gap-4 xl:grid-cols-2 xl:items-start">
            <section className="card-app px-5 py-4">
                <div className="skeleton h-40" />
            </section>
            <section className="card-app px-5 py-4">
                <div className="skeleton h-40" />
            </section>
        </div>
    </div>
);

const liveText = (ready, hasQuery, shown, scopeTotal) => {
    if (!ready) return "";
    if (!shown) return PATIENT_DEBT_TEXT.NO_RESULT;
    return hasQuery ? PATIENT_DEBT_TEXT.SHOWN(shown, scopeTotal) : "";
};

const PaymentDebts = () => {
    const { isList, query, load, items, filtered, item, ui, setUi, h1Ref, navEventKey, fromList, listSearch, navigate, updateList, openDebt, retry: reload } = usePatientDebtNavigation();
    const composingAt = useRef(null);

    const ready = load.status === "ready";
    const hasItems = ready && items.length > 0;
    const scopeTotal = inType(items, query.type).length;
    const hasQuery = Boolean(query.q) || query.status.length > 0;
    const listHref = ROUTES.PAYMENT_DEBTS + (fromList ?? "");

    const retry = () => {
        h1Ref.current?.focus({ preventScroll: true });
        reload();
    };

    const closePopover = (openerId) => {
        setUi({ popover: null });
        if (openerId) focusById(openerId);
    };

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setUi({ searchInput: value });
        if (!event.nativeEvent.isComposing) updateList({ q: value });
    };

    const handleCompositionStart = () => {
        composingAt.current = navEventKey;
    };

    const handleCompositionEnd = (event) => {
        const kept = composingAt.current === navEventKey;
        composingAt.current = null;
        if (kept) updateList({ q: event.currentTarget.value });
        else setUi({ searchInput: query.q });
    };

    const clearSearch = () => {
        setUi({ searchInput: "" });
        updateList({ q: "" });
        focusById(DEBT_SEARCH_ID);
    };

    const toggleStatus = (value) => updateList({ status: query.status.includes(value) ? query.status.filter((entry) => entry !== value) : [...query.status, value] });

    const clearStatus = () => {
        updateList({ status: [] });
        closePopover(DEBT_FILTER_BUTTON_ID);
    };

    const dismissPopover = (byEscape) => closePopover(byEscape ? (ui.popover === "sort" ? DEBT_SORT_BUTTON_ID : DEBT_FILTER_BUTTON_ID) : null);

    const selectSort = (sort) => {
        updateList({ sort });
        closePopover(DEBT_SORT_BUTTON_ID);
    };

    const removeStatus = (value, last) => {
        updateList({ status: query.status.filter((entry) => entry !== value) });
        if (last) focusById(DEBT_SEARCH_ID);
    };

    const clearAll = () => {
        setUi({ searchInput: "", popover: null });
        updateList({ q: "", status: [] });
        focusById(DEBT_SEARCH_ID);
    };

    const openDrawer = (event) => {
        event.currentTarget.focus();
        setUi({ drawerOpen: true, popover: null });
    };

    const goBack = (event) => {
        if (!isPlainClick(event) || fromList == null) return;
        event.preventDefault();
        navigate(-1);
    };

    const liveRegion = (
        <p className="sr-only" role="status">
            {isList ? liveText(hasItems, hasQuery, filtered.length, scopeTotal) : ""}
        </p>
    );

    if (isList) {
        return (
            <>
                <div className="page-header">
                    <div>
                        <h1 id={DEBT_TITLE_ID} ref={h1Ref} tabIndex={-1} className={TITLE_CLASS}>
                            {PATIENT_DEBT_TEXT.TITLE}
                        </h1>
                        <p className="page-description">{PATIENT_DEBT_TEXT.DESCRIPTION}</p>
                    </div>
                </div>
                {liveRegion}
                {load.status === "loading" && <ListSkeleton />}
                {load.status === "error" && (
                    <StateBox icon={AlertCircle} title={PATIENT_DEBT_TEXT.ERROR_TITLE} text={PATIENT_DEBT_TEXT.ERROR_TEXT}>
                        <button id={DEBT_RETRY_ID} type="button" className="btn btn-secondary mt-3" onClick={retry}>
                            {PATIENT_DEBT_TEXT.RETRY}
                        </button>
                    </StateBox>
                )}
                {ready && !hasItems && <StateBox icon={Wallet} title={PATIENT_DEBT_TEXT.EMPTY_TITLE} text={PATIENT_DEBT_TEXT.EMPTY_TEXT} />}
                {hasItems && (
                    <section className="card-app p-0">
                        <PatientDebtToolbar
                            query={query}
                            searchInput={ui.searchInput}
                            popover={ui.popover}
                            typeCounts={countByType(items)}
                            statusCounts={countByStatus(items, query.type)}
                            shown={filtered.length}
                            scopeTotal={scopeTotal}
                            onSelectType={(type) => updateList({ type })}
                            onSearchChange={handleSearchChange}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={handleCompositionEnd}
                            onClearSearch={clearSearch}
                            onTogglePopover={(key) => setUi({ popover: ui.popover === key ? null : key })}
                            onToggleStatus={toggleStatus}
                            onClearStatus={clearStatus}
                            onDoneFilter={() => closePopover(DEBT_FILTER_BUTTON_ID)}
                            onDismissPopover={dismissPopover}
                            onSelectSort={selectSort}
                            onRemoveStatus={removeStatus}
                            onClearAll={clearAll}
                            onOpenDrawer={openDrawer}
                        />
                        <PatientDebtTable
                            list={sortDebts(filtered, query.sort)}
                            page={query.page}
                            separated={hasQuery}
                            linkState={{ [DEBT_NAV_FLAG]: true, fromList: listSearch }}
                            onOpen={openDebt}
                            onPageChange={(page) => updateList({ page })}
                            onClearAll={clearAll}
                        />
                    </section>
                )}
                {ui.drawerOpen && <StatusDefinitionDrawer groups={PATIENT_DEBT_STATUS_GUIDE} titleClassName="text-muted" onClose={() => setUi({ drawerOpen: false })} />}
            </>
        );
    }

    const crumbLast = load.status === "loading" ? PATIENT_DEBT_TEXT.CRUMB_LOADING : load.status === "error" ? PATIENT_DEBT_TEXT.CRUMB_ERROR : (item?.name ?? PATIENT_DEBT_TEXT.CRUMB_NOT_FOUND);
    const detailTitle = (hidden) => (
        <h1 id={DEBT_TITLE_ID} ref={h1Ref} tabIndex={-1} className={cx(TITLE_CLASS, hidden ? "sr-only" : "mb-6")}>
            {PATIENT_DEBT_TEXT.DETAIL_TITLE}
        </h1>
    );

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Link to={listHref} state={BACK_STATE} className="btn btn-secondary h-8 px-3" onClick={goBack}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {PATIENT_DEBT_TEXT.BACK}
                </Link>
                <Breadcrumb items={[{ label: PATIENT_DEBT_TEXT.TITLE, href: listHref }, { label: crumbLast }]} />
            </div>
            {liveRegion}
            {!item && detailTitle(load.status === "loading")}
            {load.status === "loading" && <DetailSkeleton />}
            {load.status === "error" && (
                <>
                    <StateBox icon={AlertCircle} title={PATIENT_DEBT_TEXT.ERROR_TITLE} text={PATIENT_DEBT_TEXT.ERROR_TEXT}>
                        <button id={DEBT_RETRY_ID} type="button" className="btn btn-secondary mt-3" onClick={retry}>
                            {PATIENT_DEBT_TEXT.RETRY}
                        </button>
                    </StateBox>
                </>
            )}
            {ready && !item && (
                <>
                    <StateBox icon={Search} title={PATIENT_DEBT_TEXT.NOT_FOUND_TITLE} text={PATIENT_DEBT_TEXT.NOT_FOUND_TEXT}>
                        <Link to={listHref} state={BACK_STATE} className="btn btn-secondary mt-3" onClick={goBack}>
                            {PATIENT_DEBT_TEXT.BACK_TO_LIST}
                        </Link>
                    </StateBox>
                </>
            )}
            {item && (
                <>
                    <PatientDebtOverview key={item.id} item={item} h1Ref={h1Ref} />
                    <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                        <div className="flex min-w-0 flex-col gap-4 xl:grow-21 xl:basis-0">
                            <PatientDebtSchedule item={item} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-4 xl:grow-20 xl:basis-0">
                            <PatientDebtPayments item={item} />
                            <PatientDebtRefunds item={item} />
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default PaymentDebts;
