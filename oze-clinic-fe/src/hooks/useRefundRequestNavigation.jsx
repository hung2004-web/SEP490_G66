import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getMyRefundRequests, getMyRefundableInvoices } from "@/services/refundRequestService";
import { REFUND_REQUEST_TEXT } from "@/utils/messages";
import {
    CODE_PATTERN,
    REFUND_CREATE_ID,
    REFUND_NAV_FLAG,
    REFUND_RETRY_ID,
    buildRefundSearch,
    canonicalCode,
    nextRefundQuery,
    randomId,
    readRefundQuery,
    refundPickSelector,
    resolveRefunds,
} from "@/utils/refundRequest";
import { ROUTES } from "@/utils/routes";

const LIST_STATE = { [REFUND_NAV_FLAG]: true };
const EMPTY_REQUESTS = [];

const mergeUi = (state, patch) => ({ ...state, ...patch });

const canTakeFocus = (active, allowed) => !active || active === document.body || !active.isConnected || allowed.includes(active);

const classify = (navigationType, state) => {
    const flagged = state?.[REFUND_NAV_FLAG] === true;
    if (navigationType === "POP") return "pop";
    if (navigationType === "PUSH" && flagged && CODE_PATTERN.test(String(state.pick ?? ""))) return "pick";
    if (navigationType === "REPLACE" && flagged) return "listUpdate";
    return "enter";
};

const visiblePick = (code) => (code ? ([...document.querySelectorAll(refundPickSelector(code))].find((element) => element.offsetParent !== null) ?? null) : null);

const pageTitle = (ready, view) => {
    if (!ready) return REFUND_REQUEST_TEXT.TITLE;
    if (view.missing) return REFUND_REQUEST_TEXT.DOCUMENT_NOT_FOUND;
    return view.selected ? REFUND_REQUEST_TEXT.DOCUMENT_DETAIL(view.selected.code) : REFUND_REQUEST_TEXT.TITLE;
};

const keptState = (state) => Object.fromEntries(["pick", "mount", "created"].filter((key) => state?.[key] !== undefined).map((key) => [key, state[key]]));

const useRefundRequestNavigation = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const rawQuery = readRefundQuery(searchParams);

    const [mount] = useState(() => randomId());
    const [load, setLoad] = useState({ id: 1, status: "loading", data: null, source: "nav" });
    const [ui, setUi] = useReducer(mergeUi, { searchInput: rawQuery.q, popover: null, drawerOpen: false, createOpen: false, sending: false, uncertain: false, live: null });
    const [createdCode, setCreatedCode] = useState(null);
    const [navEvent, setNavEvent] = useState(() => ({
        key: location.key,
        kind: "enter",
        pop: navigationType === "POP",
        canonical: false,
        created: false,
        closedCode: null,
        firstClose: false,
        focusAtNav: document.activeElement,
        request: rawQuery.request,
        prevRequest: null,
        prevShown: false,
    }));

    const h1Ref = useRef(null);
    const closeButtonRef = useRef(null);
    const handled = useRef({ nav: null, loadId: null });
    const settled = useRef({ nav: null, element: null });
    const scrolled = useRef(null);
    const closingRef = useRef(null);
    const createdRecordsRef = useRef(new Map());
    const createFocusRef = useRef(null);
    const latestNavKeyRef = useRef(location.key);

    if (location.key !== navEvent.key) {
        const state = location.state;
        const kind = classify(navigationType, state);
        const canonical = kind === "listUpdate" && state?.canonical === true;
        const created = kind === "pick" && state?.created === true;
        const prevShown = load.status === "ready" && Boolean(navEvent.request) && !ui.createOpen;
        const closedCode = kind === "listUpdate" ? canonicalCode(state?.closed) : kind === "pop" && !rawQuery.request && prevShown ? navEvent.request : null;
        const firstClose = Boolean(closedCode) && closedCode === createdCode;
        const leftCreated = !created && load.status === "loading" && load.source === "create" && rawQuery.request !== createdCode;
        if (createdCode && (firstClose || leftCreated)) setCreatedCode(null);
        if (created) {
            setUi({ searchInput: rawQuery.q });
        } else if (kind === "listUpdate") {
            if (!canonical) setUi({ live: null });
        } else {
            setUi({
                searchInput: kind === "pick" ? ui.searchInput : rawQuery.q,
                createOpen: false,
                sending: false,
                uncertain: false,
                live: null,
                popover: null,
                drawerOpen: false,
            });
            if (load.status !== "loading") {
                if (kind === "enter" || load.status === "error") setLoad({ id: load.id + 1, status: "loading", data: null, source: "nav" });
                else if (ui.sending || ui.uncertain) setLoad({ id: load.id + 1, status: "loading", data: null, source: "uncertain" });
            }
        }
        setNavEvent({
            key: location.key,
            kind,
            pop: navigationType === "POP",
            canonical,
            created,
            closedCode,
            firstClose,
            focusAtNav: kind === "listUpdate" ? null : document.activeElement,
            request: rawQuery.request,
            prevRequest: navEvent.request,
            prevShown,
        });
    }

    const ready = load.status === "ready";
    const requests = ready ? load.data.requests : EMPTY_REQUESTS;
    const invoices = ready ? load.data.invoices : null;
    const view = resolveRefunds(requests, rawQuery);
    const canonicalUrl = ROUTES.REFUND_REQUESTS + buildRefundSearch(view.query);
    const title = pageTitle(ready, view);
    const detailOpen = ready && !ui.createOpen && (Boolean(view.selected) || view.missing);
    const showCreate = ready && (invoices === null || invoices.length > 0);

    useEffect(() => {
        if (load.status !== "loading") return undefined;
        const controller = new AbortController();
        let active = true;
        const finish = (data) => {
            if (!active || controller.signal.aborted) return;
            setLoad((current) => (current.id === load.id ? { ...current, status: data ? "ready" : "error", data } : current));
        };
        Promise.all([
            getMyRefundRequests({ signal: controller.signal }).catch(() => null),
            getMyRefundableInvoices({ signal: controller.signal, source: "page" }).catch(() => null),
        ]).then(([list, refundable]) => {
            if (!list?.success || !Array.isArray(list.data?.items)) {
                finish(null);
                return;
            }
            const created = createdRecordsRef.current;
            const codes = new Set(list.data.items.map((request) => request.code));
            codes.forEach((code) => created.delete(code));
            finish({
                requests: [...created.values(), ...list.data.items],
                invoices: refundable?.success && Array.isArray(refundable.data) ? refundable.data : null,
            });
        });
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

    useEffect(() => {
        latestNavKeyRef.current = navEvent.key;
    }, [navEvent.key]);

    useLayoutEffect(() => {
        if (scrolled.current === navEvent) return;
        scrolled.current = navEvent;
        if (navEvent.kind === "enter" && !navEvent.pop) window.scrollTo(0, 0);
    }, [navEvent]);

    useEffect(() => {
        if (!ready || location.pathname + location.search === canonicalUrl) return;
        navigate(canonicalUrl, { replace: true, state: { ...keptState(location.state), ...LIST_STATE, canonical: true } });
    }, [ready, location.key, location.pathname, location.search, location.state, canonicalUrl, navigate]);

    useEffect(() => {
        if (ui.createOpen || !createFocusRef.current) return;
        const target = createFocusRef.current;
        createFocusRef.current = null;
        const createButton = target === "create" ? document.getElementById(REFUND_CREATE_ID) : null;
        (createButton ?? h1Ref.current)?.focus({ preventScroll: true });
    }, [ui.createOpen]);

    useEffect(() => {
        if (settled.current.nav !== navEvent) settled.current = { nav: navEvent, element: document.activeElement };
        if (load.status === "loading") {
            if (canTakeFocus(document.activeElement, [navEvent.focusAtNav, settled.current.element])) h1Ref.current?.focus({ preventScroll: true });
            return;
        }
        if (handled.current.nav === navEvent && handled.current.loadId === load.id) return;
        const newLoad = handled.current.loadId !== load.id;
        handled.current = { nav: navEvent, loadId: load.id };
        const allowed = [navEvent.focusAtNav, settled.current.element, h1Ref.current].filter(Boolean);
        if (load.status === "error") {
            if (newLoad || canTakeFocus(document.activeElement, allowed)) document.getElementById(REFUND_RETRY_ID)?.focus({ preventScroll: true });
            return;
        }
        if (navEvent.canonical && !newLoad) return;
        if (newLoad && !detailOpen && (load.source === "uncertain" || load.source === "createNoCode")) {
            h1Ref.current?.focus({ preventScroll: true });
            return;
        }
        if (navEvent.closedCode && !newLoad) {
            const target = visiblePick(navEvent.closedCode) ?? (navEvent.firstClose ? document.getElementById(REFUND_CREATE_ID) : null) ?? h1Ref.current;
            target?.focus({ preventScroll: true });
            return;
        }
        if (navEvent.kind === "listUpdate" && !newLoad) return;
        if (detailOpen) {
            closeButtonRef.current?.focus();
            return;
        }
        if (!canTakeFocus(document.activeElement, allowed)) return;
        h1Ref.current?.focus({ preventScroll: true });
    }, [navEvent, load.id, load.status, load.source, detailOpen]);

    const updateList = (patch) => {
        const next = nextRefundQuery(view, patch);
        if (!next) return false;
        navigate(ROUTES.REFUND_REQUESTS + buildRefundSearch(next), { replace: true, state: LIST_STATE });
        return true;
    };

    const changePage = (page) => navigate(ROUTES.REFUND_REQUESTS + buildRefundSearch({ ...view.query, page }), { replace: true, state: LIST_STATE });

    const retry = () => setLoad((current) => ({ id: current.id + 1, status: "loading", data: null, source: "retry" }));

    const pickState = (code) => ({ [REFUND_NAV_FLAG]: true, pick: code, mount });

    const pickUrl = (code) => ROUTES.REFUND_REQUESTS + buildRefundSearch({ ...view.query, request: code });

    const closeDetail = () => {
        if (closingRef.current === navEvent) return;
        const code = rawQuery.request;
        if (!code) return;
        closingRef.current = navEvent;
        const state = location.state;
        if (state?.pick === code && state?.mount === mount) navigate(-1);
        else navigate(ROUTES.REFUND_REQUESTS + buildRefundSearch({ ...view.query, request: null }), { replace: true, state: { ...LIST_STATE, closed: code } });
    };

    const isCurrentNav = (navKey) => latestNavKeyRef.current === navKey && (window.history.state?.key ?? "default") === navKey;

    const openCreate = () => setUi({ createOpen: true, popover: null, drawerOpen: false });

    const closeCreate = () => {
        const uncertain = ui.uncertain;
        setUi({ createOpen: false, sending: false, uncertain: false });
        if (uncertain) {
            if (load.status !== "loading") setLoad((current) => ({ id: current.id + 1, status: "loading", data: null, source: "uncertain" }));
            createFocusRef.current = "h1";
            return;
        }
        createFocusRef.current = "create";
    };

    const onSendingChange = (sending) => setUi({ sending });

    const onUncertain = () => setUi({ uncertain: true });

    const onInvoicesLoaded = (list) => setLoad((current) => (current.status === "ready" ? { ...current, data: { ...current.data, invoices: list } } : current));

    const onCreated = (result) => {
        const record = result?.data;
        const valid = Boolean(record) && CODE_PATTERN.test(String(record.code ?? ""));
        setUi({ createOpen: false, sending: false, uncertain: false, live: valid ? REFUND_REQUEST_TEXT.CREATED_STATUS(record.code) : null });
        setLoad((current) => ({ id: current.id + 1, status: "loading", data: null, source: valid ? "create" : "createNoCode" }));
        if (!valid) {
            createFocusRef.current = "h1";
            toast.success(REFUND_REQUEST_TEXT.CREATED_TOAST_NO_CODE);
            return;
        }
        createdRecordsRef.current.set(record.code, record);
        setCreatedCode(record.code);
        navigate(ROUTES.REFUND_REQUESTS + buildRefundSearch({ request: record.code, q: "", status: [], sort: "new", page: null }), {
            state: { ...pickState(record.code), created: true },
        });
        toast.success(REFUND_REQUEST_TEXT.CREATED_TOAST(record.code));
    };

    return {
        load,
        requests,
        invoices,
        view,
        ui,
        setUi,
        h1Ref,
        closeButtonRef,
        navEventKey: navEvent.key,
        detailOpen,
        showCreate,
        pickState,
        pickUrl,
        updateList,
        changePage,
        retry,
        closeDetail,
        isCurrentNav,
        openCreate,
        closeCreate,
        onSendingChange,
        onUncertain,
        onInvoicesLoaded,
        onCreated,
    };
};

export default useRefundRequestNavigation;
