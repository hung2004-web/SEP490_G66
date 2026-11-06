import { MEDICAL_RECORD_QUERY, MEDICAL_RECORD_TABS, ROUTES } from "./routes";
import { MEDICAL_RECORD_TOOTH_POSITION, MEDICAL_RECORD_TOOTH_QUADRANT, MEDICAL_RECORD_TOOTH_SURFACE } from "./messages";

export const RECORD_NAV_FLAG = "medicalRecordNav";
export const RECORD_PAGE_SIZE = 5;
export const RECORD_ID_PREFIX = "medical-record";
export const RECORD_TITLE_ID = "medical-record-title";
export const RECORD_SEARCH_ID = "medical-record-search";
export const RECORD_FILTER_BUTTON_ID = "medical-record-filter-button";
export const RECORD_SORT_BUTTON_ID = "medical-record-sort-button";
export const RECORD_STATUS_BUTTON_ID = "medical-record-status-help";
export const SHEET_TAB = "sheet";
export const NO_PLAN = "none";
export const SORT_OPTIONS = [
    { value: "desc", label: "Mới nhất trước" },
    { value: "asc", label: "Cũ nhất trước" },
];
export const EMPTY_FILTERS = { doctor: [], plan: [], month: [] };
export const PAGE_STATE = { LOADING: "loading", ERROR: "error", NOT_FOUND: "notFound", NEW_PATIENT: "newPatient", CONTENT: "content" };
export const HEADING_STATES = [PAGE_STATE.NOT_FOUND, PAGE_STATE.NEW_PATIENT, PAGE_STATE.CONTENT];

const URL_TABS = Object.values(MEDICAL_RECORD_TABS);
const ID_PATTERN = /^[1-9]\d*$/;
const DOCTOR_OPTIONS = ["BS. Trần Minh Khoa", "BS. Lê Thu Hà"];
const PLAN_FILTER_ORDER = [7101, 7102, 7103, 7100, 7104, 7105, NO_PLAN];

export const norm = (value) =>
    String(value ?? "")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();

const dateKey = (value) => {
    const match = String(value ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? `${match[3]}${match[2]}${match[1]}` : "00000000";
};

const compareDate = (getDate, direction) => (a, b) => {
    const left = dateKey(getDate(a));
    const right = dateKey(getDate(b));
    return direction * (left < right ? -1 : left > right ? 1 : 0);
};

export const sortByDate = (items, getDate, direction) => [...items].sort(compareDate(getDate, direction));

export const parseRecordId = (value) => (typeof value === "string" && ID_PATTERN.test(value) ? Number(value) : null);

export const readRecordUrl = (examinationId, searchParams) => {
    const tabParam = searchParams.get(MEDICAL_RECORD_QUERY.TAB);
    const tabValid = URL_TABS.includes(tabParam);
    return {
        hasId: examinationId != null && examinationId !== "",
        id: parseRecordId(examinationId),
        tab: tabValid ? tabParam : SHEET_TAB,
        tabNeedsCleanup: searchParams.has(MEDICAL_RECORD_QUERY.TAB) && !tabValid,
        planParam: searchParams.get(MEDICAL_RECORD_QUERY.PLAN),
    };
};

export const buildRecordUrl = (visitId, tab) =>
    `${ROUTES.MEDICAL_RECORD}${visitId != null ? `/${visitId}` : ""}${tab && tab !== SHEET_TAB ? `?${MEDICAL_RECORD_QUERY.TAB}=${tab}` : ""}`;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const objectsOf = (value) => (Array.isArray(value) ? value.filter(isObject) : []);

const isDisplayValue = (value) => typeof value === "string" || (typeof value === "number" && Number.isFinite(value));

export const displayText = (value) => (isDisplayValue(value) ? String(value) : "—");

export const isPlainClick = (event) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const uniqueVisits = (visits) => {
    const seen = new Set();
    return visits.filter((visit) => {
        if (!Number.isInteger(visit.id) || visit.id <= 0 || seen.has(visit.id)) return false;
        seen.add(visit.id);
        return true;
    });
};

const normalizePlan = (plan) => ({ ...plan, stages: objectsOf(plan.stages), log: objectsOf(plan.log), pays: objectsOf(plan.pays) });

const normalizeVisit = (visit) => ({ ...visit, done: Array.isArray(visit.done) ? visit.done.filter(isDisplayValue) : [] });

export const normalizeRecord = (response) => {
    const data = response?.success === true ? response.data : null;
    if (!isObject(data) || !Array.isArray(data.visits) || !data.visits.every(isObject)) return null;
    return {
        clinic: isObject(data.clinic) ? data.clinic : {},
        patient: isObject(data.patient) ? data.patient : {},
        profile: isObject(data.profile) ? data.profile : {},
        visits: uniqueVisits(data.visits).map(normalizeVisit),
        upcoming: objectsOf(data.upcoming),
        plans: objectsOf(data.plans).map(normalizePlan),
        films: objectsOf(data.films),
        chart: objectsOf(data.chart),
        history: objectsOf(data.history),
    };
};

export const newestVisitId = (visits) => sortByDate(visits, (visit) => visit.date, -1)[0]?.id ?? null;

export const resolveRecord = (url, data) => {
    const { visits, plans } = data;
    const wantsPlan = url.tab === MEDICAL_RECORD_TABS.PLAN && url.planParam != null;
    if (!visits.length) {
        return { state: url.hasId || wantsPlan ? PAGE_STATE.NOT_FOUND : PAGE_STATE.NEW_PATIENT, target: null, replaceTo: null };
    }
    if (url.hasId) {
        if (url.id == null || !visits.some((visit) => visit.id === url.id)) return { state: PAGE_STATE.NOT_FOUND, target: null, replaceTo: null };
        return { state: PAGE_STATE.CONTENT, target: url.id, replaceTo: url.tabNeedsCleanup ? buildRecordUrl(url.id, SHEET_TAB) : null };
    }
    if (wantsPlan) {
        const planId = parseRecordId(url.planParam);
        const planExists = planId != null && plans.some((plan) => plan.id === planId);
        const target = planExists ? newestVisitId(visits.filter((visit) => visit.plan === planId)) : null;
        if (target == null) return { state: PAGE_STATE.NOT_FOUND, target: null, replaceTo: null };
        return { state: PAGE_STATE.CONTENT, target, replaceTo: buildRecordUrl(target, MEDICAL_RECORD_TABS.PLAN) };
    }
    return { state: PAGE_STATE.CONTENT, target: newestVisitId(visits), replaceTo: url.tabNeedsCleanup ? buildRecordUrl(null, SHEET_TAB) : null };
};

export const getPageState = (load, url) => {
    if (load.status === "loading") return { state: PAGE_STATE.LOADING, target: null, replaceTo: null };
    if (load.status === "error") return { state: PAGE_STATE.ERROR, target: null, replaceTo: null };
    return resolveRecord(url, load.data);
};

export const monthOf = (date) => {
    const match = String(date ?? "").match(/\d{2}\/(\d{2})\/(\d{4})/);
    return match ? `Tháng ${Number(match[1])}/${match[2]}` : "Chưa xác định";
};

const monthSortKey = (label) => {
    const match = label.match(/(\d+)\/(\d+)/);
    return match ? Number(match[2]) * 100 + Number(match[1]) : 0;
};

const planLabel = (plans, value) => {
    if (value === NO_PLAN) return "Không thuộc kế hoạch";
    const plan = plans.find((item) => item.id === value);
    return plan ? `${plan.variant} · răng ${plan.teeth}` : String(value);
};

export const getFilterGroups = (data) => {
    const groups = [
        { key: "doctor", title: "Bác sĩ", values: DOCTOR_OPTIONS, get: (visit) => visit.doctor, label: (value) => value },
        { key: "plan", title: "Kế hoạch", values: PLAN_FILTER_ORDER, get: (visit) => visit.plan ?? NO_PLAN, label: (value) => planLabel(data.plans, value) },
        {
            key: "month",
            title: "Tháng",
            values: [...new Set(data.visits.map((visit) => monthOf(visit.date)))].sort((a, b) => monthSortKey(b) - monthSortKey(a)),
            get: (visit) => monthOf(visit.date),
            label: (value) => value,
        },
    ];
    return groups.map((group) => ({
        ...group,
        options: group.values.map((value) => ({
            value,
            label: group.label(value),
            count: data.visits.filter((visit) => group.get(visit) === value).length,
        })),
    }));
};

const searchText = (visit) => [visit.service, visit.diag, visit.doctor, visit.reason].join(" ");

export const filterVisits = (data, ui, groups) => {
    const keyword = ui.keyword.trim();
    const needle = norm(keyword);
    const rows = data.visits.filter(
        (visit) =>
            (!keyword || norm(searchText(visit)).includes(needle)) &&
            groups.every((group) => !ui.filters[group.key].length || ui.filters[group.key].includes(group.get(visit))),
    );
    return sortByDate(rows, (visit) => visit.date, ui.sort === "asc" ? 1 : -1);
};

export const countFilters = (filters) => Object.values(filters).reduce((total, values) => total + values.length, 0);

export const getVisitNumbers = (visits) => new Map(sortByDate(visits, (visit) => visit.date, 1).map((visit, index) => [visit.id, index + 1]));

export const pageOfVisit = (list, visitId) => {
    const index = list.findIndex((visit) => visit.id === visitId);
    return index < 0 ? 1 : Math.floor(index / RECORD_PAGE_SIZE) + 1;
};

export const getSelection = (ui, list, target) => (!ui.selectionLost && list.some((visit) => visit.id === target) ? target : null);

export const getCurrentPage = (ui, list, selectedId) => {
    const totalPages = Math.max(1, Math.ceil(list.length / RECORD_PAGE_SIZE));
    const page = selectedId != null && ui.pageVisitId !== selectedId ? pageOfVisit(list, selectedId) : ui.page;
    return Math.min(Math.max(page, 1), totalPages);
};

export const nextSelection = (ui, list, target, newestId, urlHasId) => {
    if (!list.length) return { selectionLost: true, pageVisitId: null, replaceId: null };
    const keep = !ui.selectionLost && list.some((visit) => visit.id === target);
    if (keep) return { selectionLost: false, pageVisitId: target, replaceId: null };
    const first = list[0].id;
    const replaceId = !urlHasId && first === newestId ? null : first;
    return { selectionLost: false, pageVisitId: first, replaceId };
};

export const getShownPair = (pageState, ui, list, target, tab) => {
    if (pageState !== PAGE_STATE.CONTENT) return { visitId: null, tab: null };
    if (tab === MEDICAL_RECORD_TABS.HIST) return { visitId: null, tab };
    const visitId = getSelection(ui, list, target);
    return visitId == null ? { visitId: null, tab: null } : { visitId, tab };
};

export const planMoney = (plan) => {
    const pays = plan?.pays ?? [];
    const total = pays.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const paid = pays.filter((item) => item.status === "paid").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return { total, paid, left: total - paid };
};

export const toToothCode = (value) => {
    const code = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
    return Number.isInteger(code) ? code : null;
};

export const isPermanentTooth = (code) => Number.isInteger(code) && code % 10 >= 1 && code % 10 <= 8 && Math.floor(code / 10) >= 1 && Math.floor(code / 10) <= 4;

export const toothName = (code) =>
    isPermanentTooth(code) ? `${MEDICAL_RECORD_TOOTH_POSITION[code % 10]}, ${MEDICAL_RECORD_TOOTH_QUADRANT[Math.floor(code / 10)]}` : "";

export const surfaceText = (surface) =>
    [...String(surface)].map((code) => (Object.hasOwn(MEDICAL_RECORD_TOOTH_SURFACE, code) ? `${MEDICAL_RECORD_TOOTH_SURFACE[code]} (${code})` : code)).join(", ");

export const chartOf = (data, visitId) => data.chart.filter((entry) => entry.visit === visitId);

export const resolveTooth = (entries, currentTooth) => {
    const codes = entries.map((entry) => toToothCode(entry.tooth)).filter(isPermanentTooth);
    if (!codes.length) return currentTooth;
    return codes.includes(currentTooth) ? currentTooth : codes[0];
};

export const teethLinks = (teeth) => (/^\d/.test(String(teeth ?? "")) ? String(teeth).split(/,\s*/) : null);

export const getToothState = (entries) => {
    const surfaces = {};
    let pulp = null;
    let crown = null;
    let watch = null;
    sortByDate(entries, (entry) => entry.date, 1).forEach((entry) => {
        if (entry.surf) {
            [...String(entry.surf)].forEach((code) => {
                if (Object.hasOwn(MEDICAL_RECORD_TOOTH_SURFACE, code)) surfaces[code] = entry;
            });
        }
        if (entry.kind === "rct" || entry.kind === "pulp") pulp = entry;
        if (entry.kind === "crown") crown = entry;
        if (entry.kind === "impacted") watch = entry;
    });
    const statuses = [...new Set([...Object.values(surfaces), pulp, crown, watch].filter(Boolean).map((entry) => entry.st))];
    return { surfaces, pulp, crown, watch, statuses };
};
