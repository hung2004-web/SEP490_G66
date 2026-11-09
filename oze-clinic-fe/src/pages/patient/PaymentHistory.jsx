import { useRef } from "react";
import { AlertCircle, Receipt } from "lucide-react";
import StatusDefinitionDrawer from "@/components/medicalRecord/StatusDefinitionDrawer";
import PatientDebtRefunds from "@/components/patientDebt/PatientDebtRefunds";
import PaymentHistorySummary from "@/components/paymentHistory/PaymentHistorySummary";
import PaymentHistoryTable from "@/components/paymentHistory/PaymentHistoryTable";
import PaymentHistoryToolbar from "@/components/paymentHistory/PaymentHistoryToolbar";
import PaymentReceipt from "@/components/paymentHistory/PaymentReceipt";
import usePaymentHistoryNavigation from "@/hooks/usePaymentHistoryNavigation";
import { PAYMENT_HISTORY_STATUS_GUIDE, PAYMENT_HISTORY_TEXT } from "@/utils/messages";
import {
    HISTORY_FILTER_BUTTON_ID,
    HISTORY_REFUNDS_TITLE_ID,
    HISTORY_RETRY_ID,
    HISTORY_SEARCH_ID,
    HISTORY_SORT_BUTTON_ID,
    HISTORY_TITLE_ID,
    countBy,
    historyMonths,
    receiptTotals,
} from "@/utils/paymentHistory";

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

const LoadingSkeleton = () => (
    <section aria-busy="true" aria-label={PAYMENT_HISTORY_TEXT.LOADING}>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="card-app px-5 py-4">
                    <div className="skeleton h-14" />
                </div>
            ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-9 xl:items-start">
            <div className="card-app px-5 py-4 xl:col-span-4">
                <div className="skeleton h-60" />
            </div>
            <div className="card-app px-5 py-4 xl:col-span-5">
                <div className="skeleton h-90" />
            </div>
        </div>
    </section>
);

const toggleValue = (list, value) => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);

const liveText = (view, hasData) => {
    if (!hasData) return "";
    const hasQuery = Boolean(view.query.q) || view.query.status.length > 0 || view.query.month.length > 0;
    const listText = view.list.length ? (hasQuery ? PAYMENT_HISTORY_TEXT.SHOWN(view.list.length, view.total) : "") : PAYMENT_HISTORY_TEXT.NO_RESULT;
    return [view.missing ? PAYMENT_HISTORY_TEXT.NOT_FOUND_STATUS : "", listText].filter(Boolean).join(" ");
};

const PaymentHistory = () => {
    const { load, items, profile, view, ui, setUi, h1Ref, receiptRef, navEventKey, updateList, changePage, showLatest, focusReceipt, retry: reload } = usePaymentHistoryNavigation();
    const composingAt = useRef(null);

    const ready = load.status === "ready";
    const hasData = ready && items.length > 0;
    const { query } = view;
    const months = historyMonths(items);

    const closePopover = (openerId) => {
        setUi({ popover: null });
        if (openerId) focusById(openerId);
    };

    const retry = () => {
        h1Ref.current?.focus({ preventScroll: true });
        reload();
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
        focusById(HISTORY_SEARCH_ID);
    };

    const toggleFilter = (group, value) => updateList({ [group]: toggleValue(query[group], value) });

    const clearFilters = () => {
        updateList({ status: [], month: [] });
        closePopover(HISTORY_FILTER_BUTTON_ID);
    };

    const dismissPopover = (byEscape) => closePopover(byEscape ? (ui.popover === "sort" ? HISTORY_SORT_BUTTON_ID : HISTORY_FILTER_BUTTON_ID) : null);

    const selectSort = (sort) => {
        updateList({ sort });
        closePopover(HISTORY_SORT_BUTTON_ID);
    };

    const removeChip = (group, value, last) => {
        updateList({ [group]: query[group].filter((entry) => entry !== value) });
        if (last) focusById(HISTORY_SEARCH_ID);
    };

    const clearAll = () => {
        setUi({ searchInput: "", popover: null });
        updateList({ q: "", status: [], month: [] });
        focusById(HISTORY_SEARCH_ID);
    };

    const openDrawer = (event) => {
        event.currentTarget.focus();
        setUi({ drawerOpen: true, popover: null });
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 id={HISTORY_TITLE_ID} ref={h1Ref} tabIndex={-1} className={TITLE_CLASS}>
                        {PAYMENT_HISTORY_TEXT.TITLE}
                    </h1>
                    <p className="page-description">{PAYMENT_HISTORY_TEXT.DESCRIPTION}</p>
                </div>
            </div>
            <p className="sr-only" role="status">
                {liveText({ ...view, total: items.length }, hasData)}
            </p>
            {load.status === "loading" && <LoadingSkeleton />}
            {load.status === "error" && (
                <StateBox icon={AlertCircle} title={PAYMENT_HISTORY_TEXT.ERROR_TITLE} text={PAYMENT_HISTORY_TEXT.ERROR_TEXT}>
                    <button id={HISTORY_RETRY_ID} type="button" className="btn btn-secondary mt-3" onClick={retry}>
                        {PAYMENT_HISTORY_TEXT.RETRY}
                    </button>
                </StateBox>
            )}
            {ready && !hasData && <StateBox icon={Receipt} title={PAYMENT_HISTORY_TEXT.EMPTY_TITLE} text={PAYMENT_HISTORY_TEXT.EMPTY_TEXT} />}
            {hasData && (
                <>
                    <PaymentHistorySummary totals={receiptTotals(items)} count={items.length} />
                    <div className="grid gap-4 xl:grid-cols-9 xl:items-start">
                        <section className="card-app min-w-0 p-0 xl:col-span-4">
                            <PaymentHistoryToolbar
                                query={query}
                                searchInput={ui.searchInput}
                                popover={ui.popover}
                                months={months}
                                statusCounts={countBy(items, "status")}
                                monthCounts={countBy(items, "month")}
                                shown={view.list.length}
                                total={items.length}
                                onSearchChange={handleSearchChange}
                                onCompositionStart={handleCompositionStart}
                                onCompositionEnd={handleCompositionEnd}
                                onClearSearch={clearSearch}
                                onTogglePopover={(key) => setUi({ popover: ui.popover === key ? null : key })}
                                onToggleFilter={toggleFilter}
                                onClearFilters={clearFilters}
                                onDoneFilter={() => closePopover(HISTORY_FILTER_BUTTON_ID)}
                                onDismissPopover={dismissPopover}
                                onSelectSort={selectSort}
                                onRemoveChip={removeChip}
                                onClearAll={clearAll}
                                onOpenDrawer={openDrawer}
                            />
                            <PaymentHistoryTable view={view} onFocusReceipt={focusReceipt} onPageChange={changePage} onClearAll={clearAll} />
                        </section>
                        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
                            <PaymentReceipt receipt={view.selected} profile={profile} missing={view.missing} titleRef={receiptRef} onShowLatest={showLatest} />
                            {view.selected && (
                                <PatientDebtRefunds item={view.selected} titleId={HISTORY_REFUNDS_TITLE_ID} emptyText={PAYMENT_HISTORY_TEXT.NO_REFUND} />
                            )}
                        </div>
                    </div>
                </>
            )}
            {ui.drawerOpen && <StatusDefinitionDrawer groups={PAYMENT_HISTORY_STATUS_GUIDE} titleClassName="text-muted" onClose={() => setUi({ drawerOpen: false })} />}
        </>
    );
};

export default PaymentHistory;
