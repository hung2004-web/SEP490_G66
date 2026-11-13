import { useRef } from "react";
import { AlertCircle, Inbox, Send } from "lucide-react";
import StatusDefinitionDrawer from "@/components/medicalRecord/StatusDefinitionDrawer";
import RefundRequestCreateModal from "@/components/refund/RefundRequestCreateModal";
import RefundRequestDetailModal from "@/components/refund/RefundRequestDetailModal";
import RefundRequestList from "@/components/refund/RefundRequestList";
import RefundRequestToolbar from "@/components/refund/RefundRequestToolbar";
import useRefundRequestNavigation from "@/hooks/useRefundRequestNavigation";
import { REFUND_REQUEST_TEXT } from "@/utils/messages";
import {
    REFUND_CREATE_ID,
    REFUND_FILTER_BUTTON_ID,
    REFUND_RETRY_ID,
    REFUND_SEARCH_ID,
    REFUND_SORT_BUTTON_ID,
    REFUND_STATUS_GROUPS,
    REFUND_TITLE_ID,
    countByStatus,
    refundLiveText,
} from "@/utils/refundRequest";

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
    <section className="card-app p-0" aria-busy="true" aria-label={REFUND_REQUEST_TEXT.LOADING}>
        <div className="border-b border-border px-5 py-3">
            <div className="skeleton h-8" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="px-5 py-3">
                <div className="skeleton h-12" />
            </div>
        ))}
    </section>
);

const toggleValue = (list, value) => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);

const RefundRequests = () => {
    const {
        load,
        requests,
        view,
        ui,
        setUi,
        h1Ref,
        closeButtonRef,
        navEventKey,
        detailOpen,
        showCreate,
        pickState,
        pickUrl,
        updateList,
        changePage,
        retry: reload,
        closeDetail,
        isCurrentNav,
        openCreate,
        closeCreate,
        onSendingChange,
        onUncertain,
        onInvoicesLoaded,
        onCreated,
    } = useRefundRequestNavigation();
    const composingAt = useRef(null);

    const ready = load.status === "ready";
    const hasData = ready && requests.length > 0;
    const { query } = view;

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
        focusById(REFUND_SEARCH_ID);
    };

    const toggleFilter = (group, value) => updateList({ [group]: toggleValue(query[group], value) });

    const clearFilters = () => {
        updateList({ status: [] });
        closePopover(REFUND_FILTER_BUTTON_ID);
    };

    const dismissPopover = (byEscape) => closePopover(byEscape ? (ui.popover === "sort" ? REFUND_SORT_BUTTON_ID : REFUND_FILTER_BUTTON_ID) : null);

    const selectSort = (sort) => {
        updateList({ sort });
        closePopover(REFUND_SORT_BUTTON_ID);
    };

    const removeChip = (group, value, last) => {
        updateList({ [group]: query[group].filter((entry) => entry !== value) });
        if (last) focusById(REFUND_FILTER_BUTTON_ID);
    };

    const clearAll = () => {
        setUi({ searchInput: "", popover: null });
        updateList({ q: "", status: [] });
        focusById(REFUND_SEARCH_ID);
    };

    const openDrawer = (event) => {
        event.currentTarget.focus();
        setUi({ drawerOpen: true, popover: null });
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 id={REFUND_TITLE_ID} ref={h1Ref} tabIndex={-1} className={TITLE_CLASS}>
                        {REFUND_REQUEST_TEXT.TITLE}
                    </h1>
                    <p className="page-description">{REFUND_REQUEST_TEXT.DESCRIPTION}</p>
                </div>
                {showCreate && (
                    <button id={REFUND_CREATE_ID} type="button" className="btn btn-primary" onClick={openCreate}>
                        <Send className="size-4" aria-hidden="true" />
                        {REFUND_REQUEST_TEXT.CREATE}
                    </button>
                )}
            </div>
            <p className="sr-only" role="status">
                {refundLiveText({ view, hasData: ready, live: ui.live })}
            </p>
            {load.status === "loading" && <LoadingSkeleton />}
            {load.status === "error" && (
                <StateBox icon={AlertCircle} title={REFUND_REQUEST_TEXT.ERROR_TITLE} text={REFUND_REQUEST_TEXT.ERROR_TEXT}>
                    <button id={REFUND_RETRY_ID} type="button" className="btn btn-secondary mt-3" onClick={retry}>
                        {REFUND_REQUEST_TEXT.RETRY}
                    </button>
                </StateBox>
            )}
            {ready && !hasData && <StateBox icon={Inbox} title={REFUND_REQUEST_TEXT.EMPTY_TITLE} text={REFUND_REQUEST_TEXT.EMPTY_TEXT} />}
            {hasData && (
                <section className="card-app min-w-0 p-0">
                    <RefundRequestToolbar
                        query={query}
                        searchInput={ui.searchInput}
                        popover={ui.popover}
                        statusCounts={countByStatus(requests)}
                        shown={view.list.length}
                        total={requests.length}
                        onSearchChange={handleSearchChange}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        onClearSearch={clearSearch}
                        onTogglePopover={(key) => setUi({ popover: ui.popover === key ? null : key })}
                        onToggleFilter={toggleFilter}
                        onClearFilters={clearFilters}
                        onDoneFilter={() => closePopover(REFUND_FILTER_BUTTON_ID)}
                        onDismissPopover={dismissPopover}
                        onSelectSort={selectSort}
                        onRemoveChip={removeChip}
                        onClearAll={clearAll}
                        onOpenDrawer={openDrawer}
                    />
                    <RefundRequestList view={view} pickUrl={pickUrl} pickState={pickState} onPageChange={changePage} onClearAll={clearAll} />
                </section>
            )}
            {detailOpen && <RefundRequestDetailModal key={query.request} request={view.selected} code={query.request} closeButtonRef={closeButtonRef} onClose={closeDetail} />}
            {ui.createOpen && (
                <RefundRequestCreateModal
                    navKey={navEventKey}
                    isCurrentNav={isCurrentNav}
                    onInvoicesLoaded={onInvoicesLoaded}
                    onSendingChange={onSendingChange}
                    onUncertain={onUncertain}
                    onCreated={onCreated}
                    onClose={closeCreate}
                />
            )}
            {ui.drawerOpen && <StatusDefinitionDrawer groups={REFUND_STATUS_GROUPS} titleClassName="text-muted" onClose={() => setUi({ drawerOpen: false })} />}
        </>
    );
};

export default RefundRequests;
