import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from "react-router-dom";
import { getMyMedicalRecord } from "@/services/patientDashboardService";
import {
    EMPTY_FILTERS,
    HEADING_STATES,
    PAGE_STATE,
    RECORD_NAV_FLAG,
    RECORD_STATUS_BUTTON_ID,
    buildRecordUrl,
    filterVisits,
    getFilterGroups,
    getPageState,
    getShownPair,
    normalizeRecord,
    readRecordUrl,
} from "@/utils/medicalRecord";
import { MEDICAL_RECORD_TABS } from "@/utils/routes";

export const INITIAL_UI = {
    searchInput: "",
    keyword: "",
    filters: EMPTY_FILTERS,
    sort: "desc",
    page: 1,
    pageVisitId: null,
    selectionLost: false,
    tooth: null,
    collapsed: {},
    popover: null,
    drawerOpen: false,
    queryVersion: 0,
};

const QUERY_RESET = { searchInput: "", keyword: "", filters: EMPTY_FILTERS, sort: "desc", selectionLost: false, pageVisitId: null };

const OWN_STATE = { [RECORD_NAV_FLAG]: true };

export const queryResetPatch = (ui) => ({ ...QUERY_RESET, queryVersion: ui.queryVersion + 1 });

export const focusElement = (element) => element?.focus({ preventScroll: true });

const mergeUi = (state, patch) => ({ ...state, ...(typeof patch === "function" ? patch(state) : patch) });

const isLostFocus = (element) => !element || element === document.body || !element.isConnected || element.disabled === true;

const describeState = (load, url, ui) => {
    const page = getPageState(load, url);
    if (page.state !== PAGE_STATE.CONTENT) return { page, list: [], shown: getShownPair(page.state, ui, [], null, url.tab) };
    const list = filterVisits(load.data, ui, getFilterGroups(load.data));
    return { page, list, shown: getShownPair(page.state, ui, list, page.target, url.tab) };
};

const shownPlanId = (data, shown) =>
    shown.tab === MEDICAL_RECORD_TABS.PLAN && shown.visitId != null ? (data?.visits.find((visit) => visit.id === shown.visitId)?.plan ?? null) : null;

const useMedicalRecordNavigation = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const navigate = useNavigate();
    const { examinationId } = useParams();
    const [searchParams] = useSearchParams();
    const url = readRecordUrl(examinationId, searchParams);

    const [load, setLoad] = useState({ id: 1, status: "loading", data: null });
    const [ui, setUi] = useReducer(mergeUi, INITIAL_UI);
    const [navEvent, setNavEvent] = useState(() => ({
        key: location.key,
        url,
        kind: "enter",
        pageStateAtNav: PAGE_STATE.LOADING,
        visitChanged: false,
        tabChanged: false,
        drawerReturn: null,
        scrollTop: navigationType !== "POP",
        focusH1: false,
    }));

    const h1Ref = useRef(null);
    const retryRef = useRef(null);
    const focusedLoadId = useRef(null);
    const handledLayoutEvent = useRef(null);
    const handledPopEvent = useRef(null);

    if (location.key !== navEvent.key) {
        const own = location.state?.[RECORD_NAV_FLAG] === true;
        const kind = navigationType === "POP" ? "pop" : own ? "own" : "enter";
        const before = describeState(load, navEvent.url, ui);
        let nextUi = ui;
        let nextLoad = load;
        if (kind === "enter") {
            nextUi = { ...INITIAL_UI, queryVersion: ui.queryVersion + 1 };
            nextLoad = { id: load.id + 1, status: "loading", data: null };
            setLoad(nextLoad);
        } else if (kind === "pop") {
            nextUi = { ...ui, popover: null, drawerOpen: false, selectionLost: false };
            const target = getPageState(load, url).target;
            if (target != null && !filterVisits(load.data, nextUi, getFilterGroups(load.data)).some((visit) => visit.id === target)) {
                nextUi = { ...nextUi, ...queryResetPatch(ui) };
            }
        }
        const after = describeState(nextLoad, url, nextUi);
        const visitChanged = before.shown.visitId !== after.shown.visitId;
        if (kind === "pop" && (visitChanged || nextUi.filters !== ui.filters)) nextUi = { ...nextUi, pageVisitId: null };
        const samePlan = shownPlanId(load.data, after.shown) != null && shownPlanId(load.data, before.shown) === shownPlanId(load.data, after.shown);
        if (nextUi !== ui) setUi(nextUi);
        setNavEvent({
            key: location.key,
            url,
            kind,
            pageStateAtNav: before.page.state,
            visitChanged,
            tabChanged: before.shown.tab !== after.shown.tab,
            drawerReturn: kind === "pop" && ui.drawerOpen ? (samePlan ? "button" : "heading") : null,
            scrollTop: kind === "enter" || (kind === "own" && location.state?.scrollTop === true),
            focusH1: kind === "own" && location.state?.focusH1 === true,
        });
    }

    const { page, list } = describeState(load, url, ui);
    const pageState = page.state;
    const replaceTo = page.replaceTo;

    useEffect(() => {
        if (load.status !== "loading") return undefined;
        const controller = new AbortController();
        let active = true;
        const finish = (record) => {
            if (!active) return;
            setLoad((current) => (current.id === load.id ? { id: load.id, status: record ? "ready" : "error", data: record } : current));
        };
        getMyMedicalRecord({ signal: controller.signal })
            .then((response) => finish(normalizeRecord(response)))
            .catch(() => finish(null));
        return () => {
            active = false;
            controller.abort();
        };
    }, [load.id, load.status]);

    useEffect(() => {
        if (load.status === "loading" || focusedLoadId.current === load.id) return;
        focusedLoadId.current = load.id;
        const active = document.activeElement;
        if (active && active !== document.body) return;
        focusElement(load.status === "error" ? retryRef.current : h1Ref.current);
    }, [load.id, load.status]);

    useLayoutEffect(() => {
        if (handledLayoutEvent.current === navEvent) return;
        handledLayoutEvent.current = navEvent;
        if (navEvent.scrollTop) window.scrollTo(0, 0);
        if (navEvent.focusH1 && HEADING_STATES.includes(pageState)) focusElement(h1Ref.current);
    }, [navEvent, pageState]);

    useEffect(() => {
        if (navEvent.kind !== "pop" || handledPopEvent.current === navEvent) return;
        handledPopEvent.current = navEvent;
        if (!HEADING_STATES.includes(navEvent.pageStateAtNav) || !HEADING_STATES.includes(pageState)) return;
        if (navEvent.drawerReturn) {
            const button = navEvent.drawerReturn === "button" ? document.getElementById(RECORD_STATUS_BUTTON_ID) : null;
            focusElement(button ?? h1Ref.current);
            return;
        }
        if (navEvent.visitChanged || navEvent.tabChanged || isLostFocus(document.activeElement)) focusElement(h1Ref.current);
    }, [navEvent, pageState]);

    useEffect(() => {
        if (replaceTo) navigate(replaceTo, { replace: true, state: OWN_STATE });
    }, [location.key, replaceTo, navigate]);

    const goTo = (visitId, tab, options = {}) => navigate(buildRecordUrl(visitId, tab), { ...options, state: { ...OWN_STATE, ...options.state } });

    const retry = () => setLoad((current) => ({ id: current.id + 1, status: "loading", data: null }));

    return { url, load, ui, setUi, page, list, pageState, h1Ref, retryRef, navigate, goTo, retry, ownState: OWN_STATE };
};

export default useMedicalRecordNavigation;
