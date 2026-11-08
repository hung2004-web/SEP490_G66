import { norm, planMoney } from "./medicalRecord";
import { PATIENT_DEBT_PAY_TYPE, PATIENT_DEBT_STATUS, PATIENT_DEBT_TEXT, PAYMENT_METHOD_LABELS } from "./messages";

export const DEBT_NAV_FLAG = "paymentDebtNav";
export const DEBT_ID_PATTERN = /^(plan|visit)-[1-9]\d*$/;
export const DEBT_PAGE_SIZE = 5;
export const DEBT_TYPE_ALL = "all";
export const DEBT_TYPES = Object.keys(PATIENT_DEBT_PAY_TYPE);
export const DEBT_STATUSES = Object.keys(PATIENT_DEBT_STATUS);
export const DEBT_DEFAULT_SORT = "due";
export const DEBT_SORTS = [
    { value: "due", label: PATIENT_DEBT_TEXT.SORT_DUE },
    { value: "left", label: PATIENT_DEBT_TEXT.SORT_LEFT },
    { value: "new", label: PATIENT_DEBT_TEXT.SORT_NEW },
];

export const DEBT_TITLE_ID = "payment-debt-title";
export const DEBT_SEARCH_ID = "payment-debt-search";
export const DEBT_FILTER_BUTTON_ID = "payment-debt-filter-button";
export const DEBT_SORT_BUTTON_ID = "payment-debt-sort-button";
export const DEBT_STATUS_BUTTON_ID = "payment-debt-status-help";
export const DEBT_RETRY_ID = "payment-debt-retry";

export const debtOpenSelector = (id) => `[data-debt-open="${id}"]`;

const NO_DATE = "—";
const NO_DATE_KEY = "99999999";
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const STATUS_RANK = { overdue: 0, open: 1, paid: 2 };
const SORT_KEYS = new Set(DEBT_SORTS.map((option) => option.value));
const PAGE_PATTERN = /^[1-9]\d*$/;

const pad = (value) => String(value).padStart(2, "0");

export const toDebtDueDate = (value) => {
    const match = DATE_PATTERN.exec(String(value ?? ""));
    if (!match) return NO_DATE;
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const utc = (y, m, d) => {
        const date = new Date(0);
        date.setUTCFullYear(y, m, d);
        return date;
    };
    const real = utc(year, month, day);
    if (real.getUTCFullYear() !== year || real.getUTCMonth() !== month || real.getUTCDate() !== day) return NO_DATE;
    const lastDay = utc(year, month + 7, 0).getUTCDate();
    const due = utc(year, month + 6, Math.min(day, lastDay));
    return `${pad(due.getUTCDate())}/${pad(due.getUTCMonth() + 1)}/${String(due.getUTCFullYear()).padStart(4, "0")}`;
};

export const dateKey = (value) => {
    const match = DATE_PATTERN.exec(String(value ?? ""));
    return match ? `${match[3]}${match[2]}${match[1]}` : NO_DATE_KEY;
};

const byNewest = (getDate) => (a, b) => dateKey(getDate(b)).localeCompare(dateKey(getDate(a)));

const lineTotal = (line) => (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0) - (Number(line.discount) || 0);

const methodLabel = (code) => (Object.hasOwn(PAYMENT_METHOD_LABELS, code) ? PAYMENT_METHOD_LABELS[code] : NO_DATE);

const receiptOf = (debtMock, visitId) => (Object.hasOwn(debtMock.receipts, visitId) ? debtMock.receipts[visitId] : null);

const collectPayments = (debtMock, visitIds) =>
    visitIds
        .flatMap((visitId) =>
            (receiptOf(debtMock, visitId)?.payments ?? []).map((item, index) => ({
                key: `${visitId}-${index}`,
                visitId,
                date: item.date,
                amount: Number(item.amount) || 0,
                method: methodLabel(item.method),
            })),
        )
        .sort(byNewest((item) => item.date));

const collectRefunds = (debtMock, visitIds, visitDates) =>
    debtMock.refunds
        .filter((refund) => visitIds.includes(refund.visitId))
        .map((refund) => ({ ...refund, visitDate: visitDates.get(refund.visitId) ?? NO_DATE }))
        .sort(byNewest((refund) => refund.createdAt));

const nextStage = (stages) => stages.find((item) => item.status === "overdue") ?? stages.find((item) => item.status === "due") ?? stages.find((item) => item.status === "later") ?? null;

const debtStatus = (left, overdue) => {
    if (overdue) return "overdue";
    return left > 0 ? "open" : "paid";
};

const withDates = (item) => ({ ...item, due: toDebtDueDate(item.start), search: norm(`${item.name} ${item.sub}`) });

const buildPlanItem = (plan, record, debtMock, visitDates) => {
    const stageReceipts = Object.hasOwn(debtMock.stageReceipts, plan.id) ? debtMock.stageReceipts[plan.id] : {};
    const visitIds = record.visits.filter((visit) => visit.plan === plan.id).map((visit) => visit.id);
    const refunds = collectRefunds(debtMock, visitIds, visitDates);
    const stages = plan.pays.map((item, index) => {
        const visitId = Object.hasOwn(stageReceipts, item.label) ? stageReceipts[item.label] : null;
        const refund = item.status === "paid" && visitId != null ? (refunds.find((entry) => entry.visitId === visitId && entry.stage === item.label) ?? null) : null;
        return { key: `${plan.id}-${index}`, label: item.label, milestone: item.milestone, amount: Number(item.amount) || 0, status: item.status, note: item.note, visitId, refund };
    });
    const money = planMoney(plan);
    const left = Math.max(0, money.total - money.paid);
    return withDates({
        id: `plan-${plan.id}`,
        type: debtMock.planPayType[plan.id],
        planId: plan.id,
        name: plan.variant,
        sub: `${plan.svc} · Răng ${plan.teeth} · ${plan.doctor}`,
        rule: plan.payRule,
        total: money.total,
        paid: money.paid,
        left,
        status: debtStatus(left, stages.some((item) => item.status === "overdue")),
        start: plan.start,
        stages,
        next: nextStage(stages),
        payments: collectPayments(debtMock, visitIds),
        refunds,
    });
};

const buildVisitItem = (visit, receipt, debtMock, visitDates) => {
    const lines = receipt.lines.map((item, index) => ({ key: `${visit.id}-${index}`, name: item.name, detail: item.detail, total: lineTotal(item) }));
    const total = lines.reduce((sum, item) => sum + item.total, 0);
    const payments = collectPayments(debtMock, [visit.id]);
    const paid = payments.reduce((sum, item) => sum + item.amount, 0);
    const left = Math.max(0, total - paid);
    return withDates({
        id: `visit-${visit.id}`,
        type: "once",
        visitId: visit.id,
        name: lines.map((item) => item.name).join(", "),
        sub: `${visit.service} · ${visit.doctor}`,
        rule: PATIENT_DEBT_TEXT.ONCE_RULE,
        total,
        paid,
        left,
        status: debtStatus(left, false),
        start: visit.date,
        lines,
        payments,
        refunds: collectRefunds(debtMock, [visit.id], visitDates),
    });
};

export const buildDebtItems = (record, debtMock) => {
    const visitDates = new Map(record.visits.map((visit) => [visit.id, visit.date]));
    const inPayTypes = (planId) => planId != null && Object.hasOwn(debtMock.planPayType, planId);
    const plans = record.plans.filter((plan) => plan.status === "active" && inPayTypes(plan.id)).map((plan) => buildPlanItem(plan, record, debtMock, visitDates));
    const visits = record.visits
        .filter((visit) => !inPayTypes(visit.plan))
        .map((visit) => ({ visit, receipt: receiptOf(debtMock, visit.id) }))
        .filter(({ receipt }) => receipt && receipt.lines.reduce((sum, item) => sum + lineTotal(item), 0) > 0)
        .map(({ visit, receipt }) => buildVisitItem(visit, receipt, debtMock, visitDates));
    return [...plans, ...visits];
};

const byId = (a, b) => a.id.localeCompare(b.id);
const byDue = (a, b) => dateKey(a.due).localeCompare(dateKey(b.due));

const COMPARE = {
    due: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || byDue(a, b) || dateKey(a.start).localeCompare(dateKey(b.start)) || byId(a, b),
    left: (a, b) => b.left - a.left || byDue(a, b) || byId(a, b),
    new: (a, b) => dateKey(b.start).localeCompare(dateKey(a.start)) || byId(a, b),
};

export const inType = (items, type) => (type === DEBT_TYPE_ALL ? items : items.filter((item) => item.type === type));

export const filterDebts = (items, query) => {
    const keyword = norm(query.q.trim());
    return inType(items, query.type).filter((item) => (!keyword || item.search.includes(keyword)) && (!query.status.length || query.status.includes(item.status)));
};

export const sortDebts = (items, sort) => [...items].sort(COMPARE[sort] ?? COMPARE[DEBT_DEFAULT_SORT]);

export const countByType = (items) => Object.fromEntries([DEBT_TYPE_ALL, ...DEBT_TYPES].map((type) => [type, inType(items, type).length]));

export const countByStatus = (items, type) => {
    const scoped = inType(items, type);
    return Object.fromEntries(DEBT_STATUSES.map((status) => [status, scoped.filter((item) => item.status === status).length]));
};

export const readDebtQuery = (searchParams) => {
    const type = searchParams.get("type");
    const sort = searchParams.get("sort");
    const page = searchParams.get("page") ?? "";
    const status = (searchParams.get("status") ?? "").split(",").filter((value) => DEBT_STATUSES.includes(value));
    return {
        type: DEBT_TYPES.includes(type) ? type : DEBT_TYPE_ALL,
        q: (searchParams.get("q") ?? "").trim(),
        status: [...new Set(status)],
        sort: SORT_KEYS.has(sort) ? sort : DEBT_DEFAULT_SORT,
        page: PAGE_PATTERN.test(page) ? Number(page) : 1,
    };
};

export const buildDebtSearch = (query) => {
    const params = new URLSearchParams();
    if (query.type !== DEBT_TYPE_ALL) params.set("type", query.type);
    if (query.q.trim()) params.set("q", query.q.trim());
    if (query.status.length) params.set("status", query.status.join(","));
    if (query.sort !== DEBT_DEFAULT_SORT) params.set("sort", query.sort);
    if (query.page > 1) params.set("page", String(query.page));
    const search = params.toString().replace(/%2C/g, ",");
    return search ? `?${search}` : "";
};

export const pageCount = (total) => Math.max(1, Math.ceil(total / DEBT_PAGE_SIZE));

export const clampPage = (query, total) => ({ ...query, page: Math.min(query.page, pageCount(total)) });

export const debtProgress = (item) => {
    const percent = item.total > 0 ? Math.min(100, Math.max(0, item.left > 0 ? Math.floor((item.paid * 100) / item.total) : 100)) : 100;
    return { percent, cells: Math.floor(percent / 5) };
};

export const findDebt = (items, id) => (typeof id === "string" && DEBT_ID_PATTERN.test(id) ? (items.find((item) => item.id === id) ?? null) : null);
