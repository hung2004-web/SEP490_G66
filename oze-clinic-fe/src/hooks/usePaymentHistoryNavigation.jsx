import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { getMyPaymentHistory } from "@/services/patientDashboardService";
import { PAYMENT_HISTORY_TEXT } from "@/utils/messages";
import {
    HISTORY_NAV_FLAG,
    HISTORY_RETRY_ID,
    INVOICE_PATTERN,
    XL_QUERY,
    buildHistorySearch,
    focusReceiptTitle,
    historyPickSelector,
    nextListQuery,
    readHistoryQuery,
    resolveHistory,
} from "@/utils/paymentHistory";
import { ROUTES } from "@/utils/routes";

const LIST_STATE = { [HISTORY_NAV_FLAG]: true };
const EMPTY_DATA = { items: [], profile: {} };

const mergeUi = (state, patch) => ({ ...state, ...patch });

const canTakeFocus = (active, allowed) => !active || active === document.body || !active.isConnected || allowed.includes(active);

const classify = (navigationType, state) => {
    const flagged = state?.[HISTORY_NAV_FLAG] === true;
    if (navigationType === "POP") return "pop";
    if (navigationType === "PUSH" && flagged && INVOICE_PATTERN.test(String(state.pick ?? ""))) return "pick";
    if (navigationType === "REPLACE" && flagged && state.latest === true) return "latest";
    if (navigationType === "REPLACE" && flagged) return "listUpdate";
    return "enter";
};

const visiblePickLink = (id) => (id == null ? null : ([...document.querySelectorAll(historyPickSelector(id))].find((element) => element.offsetParent !== null) ?? null));

const pageTitle = (hasData, view) => {
    if (!hasData) return PAYMENT_HISTORY_TEXT.TITLE;
    if (view.missing) return PAYMENT_HISTORY_TEXT.DOCUMENT_NOT_FOUND;
    return view.query.invoice != null && view.selected ? PAYMENT_HISTORY_TEXT.DOCUMENT_RECEIPT(view.selected.no) : PAYMENT_HISTORY_TEXT.TITLE;
};

const usePaymentHistoryNavigation = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const rawQuery = readHistoryQuery(searchParams);

    const [load, setLoad] = useState({ id: 1, status: "loading", data: null, source: "nav" });
    const [ui, setUi] = useReducer(mergeUi, { searchInput: rawQuery.q, popover: null, drawerOpen: false });
    const [navEvent, setNavEvent] = useState(() => ({ key: location.key, kind: "enter", pop: navigationType === "POP", focusAtNav: document.activeElement }));

    const h1Ref = useRef(null);
    const receiptRef = useRef(null);
    const handled = useRef({ nav: null, loadId: null });
    const settled = useRef({ nav: null, element: null });
    const scrolled = useRef(null);

    if (location.key !== navEvent.key) {
        const kind = classify(navigationType, location.state);
        if (kind !== "listUpdate") {
            setUi(kind === "pick" ? { popover: null, drawerOpen: false } : { searchInput: rawQuery.q, popover: null, drawerOpen: false });
            if (load.status === "error") setLoad({ id: load.id + 1, status: "loading", data: null, source: "nav" });
        }
        setNavEvent({ key: location.key, kind, pop: navigationType === "POP", focusAtNav: kind === "listUpdate" ? null : document.activeElement });
    }

    const ready = load.status === "ready";
    const data = ready ? load.data : EMPTY_DATA;
    const items = data.items;
    const view = resolveHistory(items, rawQuery);
    const canonical = ROUTES.PAYMENT_HISTORY + buildHistorySearch(view.query);
    const canonicalize = ready && items.length > 0;
    const title = pageTitle(canonicalize, view);
    const invoiceKey = view.query.invoice;
    const currentId = view.current?.id ?? null;
    const hasReceipt = Boolean(view.selected) || view.missing;

    useEffect(() => {
        if (load.status !== "loading") return undefined;
        const controller = new AbortController();
        let active = true;
        const finish = (result) => {
            if (!active) return;
            setLoad((current) => (current.id === load.id ? { ...current, status: result ? "ready" : "error", data: result } : current));
        };
        getMyPaymentHistory({ signal: controller.signal })
            .then((response) =>
                finish(response?.success && Array.isArray(response.data?.items) ? { items: response.data.items, profile: response.data.profile ?? {} } : null),
            )
            .catch(() => finish(null));
        return () => {
            active = false;
            controller.abort();
        };
    }, [load.id, load.status]);

    useLayoutEffect(() => {
        const restoration = window.history.scrollRestoration;
        window.history.scrollRestoration = "manual";
        return () => {
            window.history.scrollRestoration = restoration;
        };
    }, []);

    useEffect(() => {
        const previous = document.title;
        return () => {
            document.title = previous;
        };
    }, []);

    useEffect(() => {
        document.title = title;
    }, [title]);

    useLayoutEffect(() => {
        if (scrolled.current === navEvent) return;
        scrolled.current = navEvent;
        if (navEvent.kind === "enter" && !navEvent.pop) window.scrollTo(0, 0);
    }, [navEvent]);

    useEffect(() => {
        if (canonicalize && location.pathname + location.search !== canonical) navigate(canonical, { replace: true, state: LIST_STATE });
    }, [location.key, location.pathname, location.search, canonicalize, canonical, navigate]);

    useEffect(() => {
        if (settled.current.nav !== navEvent) settled.current = { nav: navEvent, element: document.activeElement };
        if (load.status === "loading") return;
        if (handled.current.nav === navEvent && handled.current.loadId === load.id) return;
        const newLoad = handled.current.loadId !== load.id;
        handled.current = { nav: navEvent, loadId: load.id };
        if (navEvent.kind === "listUpdate" && !newLoad) return;
        const allowed = [navEvent.focusAtNav, settled.current.element, newLoad && h1Ref.current].filter(Boolean);
        if (!canTakeFocus(document.activeElement, allowed)) return;
        if (load.status === "error") {
            document.getElementById(HISTORY_RETRY_ID)?.focus({ preventScroll: true });
            return;
        }
        const receiptTitle = hasReceipt ? receiptRef.current : null;
        const kind = newLoad && load.source === "retry" ? "retry" : navEvent.kind;
        if (kind === "pop" || kind === "pick") {
            const link = window.matchMedia(XL_QUERY).matches ? visiblePickLink(currentId) : null;
            if (link) link.focus();
            else if (receiptTitle) focusReceiptTitle(receiptTitle);
            else h1Ref.current?.focus();
        } else if (kind === "latest" && receiptTitle) {
            focusReceiptTitle(receiptTitle);
        } else if (kind === "enter" && invoiceKey != null && receiptTitle && !window.matchMedia(XL_QUERY).matches) {
            focusReceiptTitle(receiptTitle);
        } else if (kind === "retry") {
            h1Ref.current?.focus({ preventScroll: true });
        } else {
            h1Ref.current?.focus();
        }
    }, [navEvent, load.id, load.status, load.source, invoiceKey, currentId, hasReceipt]);

    const updateList = (patch) => {
        const next = nextListQuery(items, view, patch);
        if (!next) return false;
        navigate(ROUTES.PAYMENT_HISTORY + buildHistorySearch(next), { replace: true, state: LIST_STATE });
        return true;
    };

    const changePage = (page) => navigate(ROUTES.PAYMENT_HISTORY + buildHistorySearch({ ...view.query, invoice: null, page }), { replace: true, state: LIST_STATE });

    const showLatest = () => navigate(ROUTES.PAYMENT_HISTORY, { replace: true, state: { ...LIST_STATE, latest: true } });

    const focusReceipt = () => focusReceiptTitle(receiptRef.current);

    const retry = () => setLoad((current) => ({ id: current.id + 1, status: "loading", data: null, source: "retry" }));

    return {
        load,
        items,
        profile: data.profile,
        view,
        ui,
        setUi,
        h1Ref,
        receiptRef,
        navEventKey: navEvent.key,
        updateList,
        changePage,
        showLatest,
        focusReceipt,
        retry,
    };
};

export default usePaymentHistoryNavigation;
