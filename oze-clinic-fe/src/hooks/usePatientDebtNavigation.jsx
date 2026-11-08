import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from "react-router-dom";
import { getMyDebts } from "@/services/patientDashboardService";
import { PATIENT_DEBT_TEXT } from "@/utils/messages";
import { DEBT_ID_PATTERN, DEBT_NAV_FLAG, DEBT_RETRY_ID, buildDebtSearch, clampPage, debtOpenSelector, filterDebts, findDebt, readDebtQuery } from "@/utils/patientDebt";
import { ROUTES } from "@/utils/routes";

const LIST_STATE = { [DEBT_NAV_FLAG]: true };

const mergeUi = (state, patch) => ({ ...state, ...(typeof patch === "function" ? patch(state) : patch) });

const readFromList = (state) => {
    const value = state?.fromList;
    return typeof value === "string" && (value === "" || value.startsWith("?")) ? value : null;
};

const canTakeFocus = (active, allowed) => !active || active === document.body || !active.isConnected || allowed.includes(active);

const pageTitle = (isList, load, item) => {
    if (isList) return PATIENT_DEBT_TEXT.DOCUMENT_TITLE;
    if (load.status !== "ready") return PATIENT_DEBT_TEXT.DOCUMENT_PENDING;
    return item ? PATIENT_DEBT_TEXT.DOCUMENT_DETAIL(item.name) : PATIENT_DEBT_TEXT.DOCUMENT_NOT_FOUND;
};

const usePatientDebtNavigation = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const navigate = useNavigate();
    const { debtId } = useParams();
    const [searchParams] = useSearchParams();
    const isList = debtId == null || debtId === "";
    const query = readDebtQuery(searchParams);

    const [load, setLoad] = useState({ id: 1, status: "loading", data: null });
    const [ui, setUi] = useReducer(mergeUi, { searchInput: query.q, popover: null, drawerOpen: false });
    const [navEvent, setNavEvent] = useState(() => ({ key: location.key, isList, kind: "enter", focusAtNav: document.activeElement }));

    const h1Ref = useRef(null);
    const handled = useRef({ nav: null, loadId: null });
    const settled = useRef({ nav: null, element: null });
    const scrolled = useRef(null);

    if (location.key !== navEvent.key) {
        const listUpdate = navigationType === "REPLACE" && location.state?.[DEBT_NAV_FLAG] === true && navEvent.isList && isList;
        if (!listUpdate) {
            setUi({ searchInput: query.q, popover: null, drawerOpen: false });
            if (load.status === "error") setLoad({ id: load.id + 1, status: "loading", data: null });
        }
        setNavEvent({ key: location.key, isList, kind: listUpdate ? "listUpdate" : "enter", focusAtNav: listUpdate ? null : document.activeElement });
    }

    const items = load.status === "ready" ? load.data : [];
    const filtered = isList ? filterDebts(items, query) : [];
    const listQuery = clampPage(query, filtered.length);
    const canonical = ROUTES.PAYMENT_DEBTS + buildDebtSearch(listQuery);
    const item = isList ? null : findDebt(items, debtId);
    const fromList = readFromList(location.state);
    const rawReturnId = isList ? location.state?.returnId : null;
    const returnId = typeof rawReturnId === "string" && DEBT_ID_PATTERN.test(rawReturnId) ? rawReturnId : null;
    const hasReturnState = isList && location.state?.returnId != null;
    const title = pageTitle(isList, load, item);
    const canonicalize = isList && load.status === "ready" && items.length > 0;

    useEffect(() => {
        if (load.status !== "loading") return undefined;
        const controller = new AbortController();
        let active = true;
        const finish = (data) => {
            if (!active) return;
            setLoad((current) => (current.id === load.id ? { id: load.id, status: data ? "ready" : "error", data } : current));
        };
        getMyDebts({ signal: controller.signal })
            .then((response) => finish(response?.success && Array.isArray(response.data?.items) ? response.data.items : null))
            .catch(() => finish(null));
        return () => {
            active = false;
            controller.abort();
        };
    }, [load.id, load.status]);

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
        if (navEvent.kind === "enter" && !navEvent.isList) window.scrollTo(0, 0);
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
        if (navEvent.kind !== "enter" && !newLoad) return;
        const allowed = [navEvent.focusAtNav, settled.current.element, newLoad && h1Ref.current].filter(Boolean);
        if (canTakeFocus(document.activeElement, allowed)) {
            if (load.status === "error") {
                document.getElementById(DEBT_RETRY_ID)?.focus({ preventScroll: true });
            } else {
                const link = returnId ? [...document.querySelectorAll(debtOpenSelector(returnId))].find((element) => element.offsetParent !== null) : null;
                if (link) link.focus();
                else h1Ref.current?.focus();
            }
        }
        if (hasReturnState) navigate(canonicalize ? canonical : location.pathname + location.search, { replace: true, state: LIST_STATE });
    }, [navEvent, load.id, load.status, returnId, hasReturnState, canonicalize, canonical, location.pathname, location.search, navigate]);

    const updateList = (patch) => {
        const next = { ...listQuery, page: 1, ...patch };
        navigate(ROUTES.PAYMENT_DEBTS + buildDebtSearch(next), { replace: true, state: LIST_STATE });
    };

    const openDebt = (id) => navigate(canonical, { replace: true, state: { ...LIST_STATE, returnId: id } });

    const retry = () => setLoad((current) => ({ id: current.id + 1, status: "loading", data: null }));

    return {
        isList,
        query: listQuery,
        load,
        items,
        filtered,
        item,
        ui,
        setUi,
        h1Ref,
        navEventKey: navEvent.key,
        fromList,
        listSearch: buildDebtSearch(listQuery),
        navigate,
        updateList,
        openDebt,
        retry,
    };
};

export default usePatientDebtNavigation;
