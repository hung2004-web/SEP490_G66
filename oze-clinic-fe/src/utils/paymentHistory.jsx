import { getVisitNumbers, norm } from "./medicalRecord";
import { PAYMENT_HISTORY_STATUS, PAYMENT_HISTORY_TEXT } from "./messages";
import { PAYMENT_HISTORY_QUERY } from "./routes";
import { collectPayments, collectRefunds, dateKey, lineTotal, receiptOf } from "./patientDebt";

export const HISTORY_NAV_FLAG = "paymentHistoryNav";
export const XL_QUERY = "(min-width: 80rem)";
export const HISTORY_PAGE_SIZE = 5;
export const HISTORY_STATUSES = Object.keys(PAYMENT_HISTORY_STATUS);
export const HISTORY_DEFAULT_SORT = "new";
export const HISTORY_SORTS = [
    { value: "new", label: PAYMENT_HISTORY_TEXT.SORT_NEW },
    { value: "old", label: PAYMENT_HISTORY_TEXT.SORT_OLD },
    { value: "left", label: PAYMENT_HISTORY_TEXT.SORT_LEFT },
    { value: "net", label: PAYMENT_HISTORY_TEXT.SORT_NET },
];
export const INVOICE_PATTERN = /^[1-9]\d{0,8}$/;
export const MONTH_PATTERN = /^(0[1-9]|1[0-2])-\d{4}$/;

export const HISTORY_TITLE_ID = "payment-history-title";
export const HISTORY_SEARCH_ID = "payment-history-search";
export const HISTORY_FILTER_BUTTON_ID = "payment-history-filter-button";
export const HISTORY_SORT_BUTTON_ID = "payment-history-sort-button";
export const HISTORY_STATUS_BUTTON_ID = "payment-history-status-help";
export const HISTORY_RETRY_ID = "payment-history-retry";
export const HISTORY_RECEIPT_TITLE_ID = "payment-history-receipt-title";
export const HISTORY_REFUNDS_TITLE_ID = "payment-history-refunds-title";

export const historyPickSelector = (id) => `[data-history-pick="${id}"]`;

const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const PAGE_PATTERN = /^[1-9]\d*$/;
const NO_VALUE = "—";
const SORT_KEYS = new Set(HISTORY_SORTS.map((option) => option.value));

export const monthKey = (date) => {
    const match = DATE_PATTERN.exec(String(date ?? ""));
    return match ? `${match[2]}-${match[3]}` : null;
};

export const monthLabel = (key) => `Tháng ${Number(key.slice(0, 2))}/${key.slice(3)}`;

export const monthOrder = (key) => Number(`${key.slice(3)}${key.slice(0, 2)}`);

export const birthYear = (dob) => DATE_PATTERN.exec(String(dob ?? ""))?.[3] ?? NO_VALUE;

export const focusReceiptTitle = (element) => {
    if (!element) return;
    element.scrollIntoView({ block: "start" });
    element.focus({ preventScroll: true });
};

const sum = (list, read) => list.reduce((total, entry) => total + read(entry), 0);
const toNumber = (value) => Number(value) || 0;

const receiptStatus = (paid, left) => {
    if (left <= 0) return "paid";
    return paid > 0 ? "partial" : "unpaid";
};

const buildReceipt = (visit, receipt, context) => {
    const lines = receipt.lines.map((line, index) => ({
        key: `${visit.id}-${index}`,
        name: line.name,
        detail: line.detail,
        quantity: toNumber(line.quantity),
        unitPrice: toNumber(line.unitPrice),
        discount: toNumber(line.discount),
        total: lineTotal(line),
    }));
    const gross = sum(lines, (line) => line.quantity * line.unitPrice);
    const disc = sum(lines, (line) => line.discount);
    const net = gross - disc;
    if (net <= 0) return null;
    const pays = collectPayments(context.debtMock, [visit.id]).map((payment) => ({ ...payment, payer: context.payer }));
    const paid = sum(pays, (payment) => payment.amount);
    const left = Math.max(0, net - paid);
    return {
        id: visit.id,
        no: context.numbers.get(visit.id),
        date: visit.date,
        doctor: visit.doctor,
        diag: visit.diag,
        reason: visit.reason,
        next: visit.next?.text || NO_VALUE,
        lines,
        gross,
        disc,
        net,
        pays,
        paid,
        left,
        status: receiptStatus(paid, left),
        refunds: collectRefunds(context.debtMock, [visit.id], context.visitDates),
        month: monthKey(visit.date),
        search: norm([...lines.flatMap((line) => [line.name, line.detail]), visit.diag, visit.doctor, visit.date].join(" ")),
    };
};

export const buildReceipts = (record, debtMock) => {
    const context = {
        debtMock,
        numbers: getVisitNumbers(record.visits),
        visitDates: new Map(record.visits.map((visit) => [visit.id, visit.date])),
        payer: record.profile?.name || NO_VALUE,
    };
    const items = record.visits
        .map((visit) => {
            const receipt = receiptOf(debtMock, visit.id);
            return receipt ? buildReceipt(visit, receipt, context) : null;
        })
        .filter(Boolean);
    return items.map((item) => ({
        ...item,
        remainAll: sum(
            items.filter((other) => dateKey(other.date) <= dateKey(item.date)),
            (other) => other.left,
        ),
    }));
};

const byNewestDate = (a, b) => dateKey(b.date).localeCompare(dateKey(a.date)) || b.id - a.id;

const COMPARE = {
    new: byNewestDate,
    old: (a, b) => dateKey(a.date).localeCompare(dateKey(b.date)) || a.id - b.id,
    left: (a, b) => b.left - a.left || byNewestDate(a, b),
    net: (a, b) => b.net - a.net || byNewestDate(a, b),
};

export const filterReceipts = (items, query) => {
    const keyword = norm(query.q.trim());
    return items.filter(
        (item) =>
            (!keyword || item.search.includes(keyword)) && (!query.status.length || query.status.includes(item.status)) && (!query.month.length || query.month.includes(item.month)),
    );
};

export const sortReceipts = (list, sort) => [...list].sort(COMPARE[sort] ?? COMPARE[HISTORY_DEFAULT_SORT]);

export const countBy = (items, key) =>
    items.reduce((counts, item) => {
        counts[item[key]] = (counts[item[key]] ?? 0) + 1;
        return counts;
    }, {});

export const historyMonths = (items) => [...new Set(items.map((item) => item.month).filter(Boolean))].sort((a, b) => monthOrder(b) - monthOrder(a));

export const receiptTotals = (list) => ({
    net: sum(list, (item) => item.net),
    paid: sum(list, (item) => item.paid),
    left: sum(list, (item) => item.left),
    payments: sum(list, (item) => item.pays.length),
});

const uniqueValid = (value, isValid) => [...new Set((value ?? "").split(",").filter(isValid))];

export const readHistoryQuery = (searchParams) => {
    const invoice = searchParams.get(PAYMENT_HISTORY_QUERY.INVOICE) ?? "";
    const sort = searchParams.get("sort");
    const page = searchParams.get("page") ?? "";
    return {
        invoice: INVOICE_PATTERN.test(invoice) ? Number(invoice) : null,
        q: (searchParams.get("q") ?? "").trim(),
        status: uniqueValid(searchParams.get("status"), (value) => HISTORY_STATUSES.includes(value)),
        month: uniqueValid(searchParams.get("month"), (value) => MONTH_PATTERN.test(value)),
        sort: SORT_KEYS.has(sort) ? sort : HISTORY_DEFAULT_SORT,
        page: PAGE_PATTERN.test(page) && Number(page) > 1 ? Number(page) : null,
    };
};

export const buildHistorySearch = (query) => {
    const params = new URLSearchParams();
    if (query.invoice != null) params.set(PAYMENT_HISTORY_QUERY.INVOICE, String(query.invoice));
    if (query.q) params.set("q", query.q);
    if (query.status.length) params.set("status", query.status.join(","));
    if (query.month.length) params.set("month", query.month.join(","));
    if (query.sort !== HISTORY_DEFAULT_SORT) params.set("sort", query.sort);
    if (query.page > 1) params.set("page", String(query.page));
    const search = params.toString().replace(/%2C/g, ",");
    return search ? `?${search}` : "";
};

const pageCount = (total) => Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));

const pageOf = (list, item) => {
    const index = item ? list.indexOf(item) : -1;
    return index < 0 ? null : Math.floor(index / HISTORY_PAGE_SIZE) + 1;
};

export const resolveHistory = (items, rawQuery) => {
    const months = new Set(items.map((item) => item.month));
    const base = { ...rawQuery, month: rawQuery.month.filter((value) => months.has(value)) };
    const list = sortReceipts(filterReceipts(items, base), base.sort);
    const pages = pageCount(list.length);
    const known = base.invoice == null ? null : (items.find((item) => item.id === base.invoice) ?? null);
    const missing = base.invoice != null && !known;
    const invoice = known && !list.includes(known) ? null : base.invoice;
    const urlPage = base.page == null ? null : Math.min(base.page, pages);
    const queryPage = urlPage > 1 ? urlPage : null;
    const page = queryPage ?? (invoice != null ? pageOf(list, known) : null) ?? 1;
    const rows = list.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
    let selected = rows[0] ?? null;
    let current = selected;
    if (missing) {
        selected = null;
        current = null;
    } else if (invoice != null) {
        selected = known;
        current = rows.includes(known) ? known : null;
    }
    return { query: { ...base, invoice, page: queryPage }, list, pages, page, rows, selected, current, missing };
};

const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

export const nextListQuery = (items, view, patch) => {
    const current = view.query;
    const next = { ...current, ...patch, q: (patch.q ?? current.q).trim() };
    if (next.q === current.q && sameList(next.status, current.status) && sameList(next.month, current.month) && next.sort === current.sort) return null;
    const kept = current.invoice == null ? null : items.find((item) => item.id === current.invoice);
    const firstPage = sortReceipts(filterReceipts(items, next), next.sort).slice(0, HISTORY_PAGE_SIZE);
    return { ...next, invoice: kept && firstPage.includes(kept) ? current.invoice : null, page: null };
};
