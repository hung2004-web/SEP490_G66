import { REFUND_REQUEST_STATUS_LABELS } from "./data/mockRefundRequests";
import { formatCurrency, formatDateTime, getClinicDateTimeParts } from "./format";
import { norm } from "./medicalRecord";
import { GENERIC_ERROR_MESSAGE, REFUND_REQUEST_STATUS_GUIDE, REFUND_REQUEST_TEXT } from "./messages";

export const REFUND_NAV_FLAG = "refundRequestsNav";
export const REFUND_PAGE_SIZE = 5;
export const REFUND_DEFAULT_SORT = "new";
export const REFUND_STATUSES = ["pending", "approved", "rejected", "refunded"];
export const REFUND_SORTS = [
    { value: "new", label: REFUND_REQUEST_TEXT.SORT_NEW },
    { value: "old", label: REFUND_REQUEST_TEXT.SORT_OLD },
    { value: "amount", label: REFUND_REQUEST_TEXT.SORT_AMOUNT },
];
export const REFUND_STATUS_GROUPS = REFUND_REQUEST_STATUS_GUIDE.map((group) => ({ ...group, labels: REFUND_REQUEST_STATUS_LABELS }));

export const REFUND_TITLE_ID = "refund-requests-title";
export const REFUND_SEARCH_ID = "refund-requests-search";
export const REFUND_FILTER_BUTTON_ID = "refund-requests-filter";
export const REFUND_SORT_BUTTON_ID = "refund-requests-sort";
export const REFUND_STATUS_BUTTON_ID = "refund-requests-status-help";
export const REFUND_RETRY_ID = "refund-requests-retry";
export const REFUND_CREATE_ID = "refund-requests-create";
export const REFUND_INVOICE_ID = "refund-requests-invoice";
export const REFUND_AMOUNT_ID = "refund-requests-amount";
export const REFUND_REASON_ID = "refund-requests-reason";
export const REFUND_SUBMIT_ID = "refund-requests-submit";
export const REFUND_REASON_MAX = 500;

export const refundPickSelector = (code) => `[data-refund-pick="${code}"]`;

export const CODE_PATTERN = /^HT(\d{4,})$/;
export const CLINIC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const API_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/i;
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;
const PAGE_PATTERN = /^\d+$/;
const SORT_KEYS = new Set(REFUND_SORTS.map((option) => option.value));
const API_STATUS = { pending: "Pending", approved: "Approved", rejected: "Rejected", refunded: "Processed" };
const FE_STATUS = Object.fromEntries(Object.entries(API_STATUS).map(([fe, api]) => [api, fe]));
const DEFINITE_ERRORS = new Set(["AMOUNT_EXCEEDS_MAX", "INVOICE_NOT_FOUND", "INVOICE_NOT_ELIGIBLE", "INVOICE_IS_DEPOSIT", "VALIDATION_FAILED"]);
const INVOICE_ERRORS = new Set(["INVOICE_NOT_FOUND", "INVOICE_NOT_ELIGIBLE", "INVOICE_IS_DEPOSIT"]);
const FIELD_KEYS = new Set(["amount", "reason"]);

const fieldError = (field) => (field === "amount" ? REFUND_REQUEST_TEXT.ERR_AMOUNT : REFUND_REQUEST_TEXT.ERR_REASON);

export const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");

const codeDigits = (code) => {
    const match = CODE_PATTERN.exec(String(code ?? ""));
    return match ? match[1].replace(/^0+/, "") || "0" : null;
};

export const canonicalCode = (value) => {
    const digits = codeDigits(value);
    return digits == null ? null : `HT${digits.padStart(4, "0")}`;
};

const compareDigits = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

export const compareCode = (a, b) => compareDigits(codeDigits(a) ?? "", codeDigits(b) ?? "");

export const nextCode = (codes) => {
    const max = codes.map(codeDigits).filter((digits) => digits != null).reduce((top, digits) => (compareDigits(digits, top) > 0 ? digits : top), "0");
    return `HT${String(BigInt(max) + 1n).padStart(4, "0")}`;
};

export const nextId = (ids) => Math.max(0, ...ids.filter(Number.isFinite)) + 1;

export const toClinicIso = (date) => {
    const { date: day, time } = getClinicDateTimeParts(date);
    return `${day.slice(6)}-${day.slice(3, 5)}-${day.slice(0, 2)}T${time}+07:00`;
};

const isClinicIso = (text) => {
    if (typeof text !== "string" || !CLINIC_ISO.test(text)) return false;
    const date = new Date(text);
    return !Number.isNaN(date.getTime()) && toClinicIso(date) === text;
};

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/;

const isWallClock = (text) => {
    const [, y, mo, d, h, mi, s = "0"] = WALL_CLOCK.exec(text) ?? [];
    if (!y) return false;
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
    return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(mo) - 1 && date.getUTCDate() === Number(d) && date.getUTCHours() === Number(h) && date.getUTCMinutes() === Number(mi) && date.getUTCSeconds() === Number(s);
};

export const parseApiTime = (value) => {
    if (typeof value !== "string") return null;
    const text = value.trim();
    if (CLINIC_ISO.test(text)) return isClinicIso(text) ? text : null;
    if (DATE_ONLY.test(text)) return isClinicIso(`${text}T00:00:00+07:00`) ? `${text}T00:00:00+07:00` : null;
    if (!API_DATE_TIME.test(text) || !isWallClock(text)) return null;
    const date = new Date(HAS_OFFSET.test(text) ? text : `${text}+07:00`);
    return Number.isNaN(date.getTime()) ? null : toClinicIso(date);
};

export const clinicDate = (iso) => (isClinicIso(iso) ? getClinicDateTimeParts(iso).date : REFUND_REQUEST_TEXT.NO_VALUE);

export const clinicDateTime = (iso) => (isClinicIso(iso) ? formatDateTime(iso) : REFUND_REQUEST_TEXT.NO_VALUE);

export const toApiStatus = (status) => API_STATUS[status] ?? null;

export const fromApiStatus = (status) => (Object.hasOwn(FE_STATUS, status) ? FE_STATUS[status] : null);

export const toApiRequest = (request) => ({
    id: request.id,
    code: request.code,
    createdAt: request.createdAt,
    invoiceId: request.visitId,
    stageLabel: request.stageLabel ?? null,
    itemNames: request.itemNames ?? [],
    paidAt: request.paidAt ?? null,
    doctorName: request.doctorName ?? null,
    amount: request.amount,
    reason: request.reason,
    status: toApiStatus(request.status),
    requestType: request.requestType ?? "Refund",
    approvedAt: request.approvedAt ?? null,
    processedAt: request.processedAt ?? null,
    rejectReason: request.rejectReason ?? null,
    refundMethod: request.refundMethod ?? null,
});

const textOrNull = (value) => (typeof value === "string" && value.trim() ? value : null);

const uniqueBy = (list, key) => {
    const seen = new Set();
    return list.filter((item) => !seen.has(item[key]) && seen.add(item[key]));
};

export const fromApiRequest = (dto) => {
    if (!dto || typeof dto !== "object") return null;
    const status = fromApiStatus(dto.status);
    const code = canonicalCode(dto.code);
    const createdAt = parseApiTime(dto.createdAt);
    if (!status || !code || !createdAt || (dto.requestType ?? "Refund") !== "Refund" || !Number.isSafeInteger(dto.amount) || dto.amount <= 0) return null;
    return {
        id: dto.id,
        code,
        visitId: Number.isSafeInteger(dto.invoiceId) ? dto.invoiceId : null,
        stageLabel: textOrNull(dto.stageLabel),
        itemNames: Array.isArray(dto.itemNames) ? dto.itemNames.filter((name) => typeof name === "string" && name.trim()) : [],
        paidAt: parseApiTime(dto.paidAt),
        doctorName: textOrNull(dto.doctorName),
        amount: dto.amount,
        reason: typeof dto.reason === "string" ? dto.reason : "",
        status,
        createdAt,
        approvedAt: parseApiTime(dto.approvedAt),
        processedAt: parseApiTime(dto.processedAt),
        rejectReason: textOrNull(dto.rejectReason),
        refundMethod: textOrNull(dto.refundMethod),
    };
};

export const normalizeRefundList = (raw) => {
    if (!raw || !Array.isArray(raw.items)) return null;
    const total = Number(raw.totalItems);
    if (Number.isFinite(total) && total > raw.items.length) return null;
    return uniqueBy(raw.items.map(fromApiRequest).filter(Boolean), "code");
};

const toDisplayDate = (invoiceDate) => `${invoiceDate.slice(8, 10)}/${invoiceDate.slice(5, 7)}/${invoiceDate.slice(0, 4)}`;

export const fromApiInvoice = (dto) => {
    if (!dto || typeof dto !== "object" || !DATE_ONLY.test(String(dto.invoiceDate ?? "")) || !parseApiTime(dto.invoiceDate)) return null;
    if (![dto.invoiceId, dto.paidAmount, dto.maxRefundable].every(Number.isSafeInteger) || dto.paidAmount <= 0 || dto.maxRefundable <= 0) return null;
    return {
        invoiceId: dto.invoiceId,
        invoiceDate: dto.invoiceDate,
        date: toDisplayDate(dto.invoiceDate),
        stageLabel: textOrNull(dto.stageLabel),
        itemNames: Array.isArray(dto.itemNames) ? dto.itemNames.filter((name) => typeof name === "string" && name.trim()) : [],
        doctorName: textOrNull(dto.doctorName),
        paidAt: parseApiTime(dto.paidAt),
        paidAmount: dto.paidAmount,
        maxRefundable: Math.min(dto.maxRefundable, dto.paidAmount),
    };
};

export const normalizeInvoiceList = (raw) => {
    if (!raw || !Array.isArray(raw.items)) return null;
    return uniqueBy(raw.items.map(fromApiInvoice).filter(Boolean), "invoiceId").sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : a.invoiceDate > b.invoiceDate ? -1 : b.invoiceId - a.invoiceId));
};

export const readRefundQuery = (searchParams) => {
    const sort = searchParams.get("sort");
    const page = searchParams.get("page") ?? "";
    const pageNumber = PAGE_PATTERN.test(page) ? (Number.isSafeInteger(Number(page)) ? Number(page) : Infinity) : 0;
    const status = new Set((searchParams.get("status") ?? "").split(","));
    return {
        request: canonicalCode(searchParams.get("request")),
        q: (searchParams.get("q") ?? "").trim(),
        status: REFUND_STATUSES.filter((value) => status.has(value)),
        sort: SORT_KEYS.has(sort) ? sort : REFUND_DEFAULT_SORT,
        page: pageNumber > 1 ? pageNumber : null,
    };
};

export const buildRefundSearch = (query) => {
    const params = new URLSearchParams();
    if (query.request) params.set("request", query.request);
    if (query.q) params.set("q", query.q);
    if (query.status.length) params.set("status", query.status.join(","));
    if (query.sort !== REFUND_DEFAULT_SORT) params.set("sort", query.sort);
    if (Number.isSafeInteger(query.page) && query.page > 1) params.set("page", String(query.page));
    const search = params.toString().replace(/%2C/g, ",");
    return search ? `?${search}` : "";
};

const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : compareCode(b.code, a.code));
const byOldest = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : compareCode(a.code, b.code));
const COMPARE = { new: byNewest, old: byOldest, amount: (a, b) => b.amount - a.amount || byNewest(a, b) };

export const forWhatText = (request) => [request.stageLabel, request.itemNames.join(", ")].filter(Boolean).join(" · ") || REFUND_REQUEST_TEXT.NO_VALUE;

const searchText = (request) => norm([request.code, request.reason, request.stageLabel, request.itemNames.join(", "), clinicDate(request.createdAt), clinicDate(request.paidAt)].join(" "));

export const filterRefunds = (items, query) => {
    const keyword = norm(query.q);
    return items.filter((request) => (!keyword || searchText(request).includes(keyword)) && (!query.status.length || query.status.includes(request.status)));
};

export const sortRefunds = (list, sort) => [...list].sort(COMPARE[sort] ?? byNewest);

export const countByStatus = (items) => Object.fromEntries(REFUND_STATUSES.map((status) => [status, items.filter((request) => request.status === status).length]));

export const resolveRefunds = (items, rawQuery) => {
    const base = items.length ? rawQuery : { ...rawQuery, q: "", status: [], sort: REFUND_DEFAULT_SORT, page: null };
    const list = sortRefunds(filterRefunds(items, base), base.sort);
    const pages = Math.max(1, Math.ceil(list.length / REFUND_PAGE_SIZE));
    const page = Math.min(base.page ?? 1, pages);
    const rows = list.slice((page - 1) * REFUND_PAGE_SIZE, page * REFUND_PAGE_SIZE);
    const selected = base.request ? (items.find((request) => request.code === base.request) ?? null) : null;
    return {
        query: { ...base, page: page > 1 ? page : null },
        list,
        pages,
        page,
        rows,
        total: items.length,
        selected,
        current: selected && rows.includes(selected) ? selected : null,
        missing: Boolean(base.request) && !selected,
    };
};

const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

export const nextRefundQuery = (view, patch) => {
    const current = view.query;
    const next = { ...current, ...patch, q: (patch.q ?? current.q).trim() };
    if (next.q === current.q && sameList(next.status, current.status) && next.sort === current.sort) return null;
    return { ...next, page: null };
};

export const processSteps = (request) => {
    const amount = formatCurrency(request.amount);
    const { status } = request;
    const review =
        status === "pending"
            ? { time: REFUND_REQUEST_TEXT.REVIEWING, state: "current", text: REFUND_REQUEST_TEXT.REVIEWING_TEXT }
            : status === "rejected"
              ? { time: clinicDateTime(request.approvedAt), state: "error", text: REFUND_REQUEST_TEXT.REJECTED_TEXT(request.rejectReason ?? REFUND_REQUEST_TEXT.NO_VALUE) }
              : { time: clinicDateTime(request.approvedAt), state: "done", text: REFUND_REQUEST_TEXT.APPROVED_TEXT(amount) };
    const refund =
        status === "refunded"
            ? { time: clinicDateTime(request.processedAt), state: "done", text: REFUND_REQUEST_TEXT.REFUNDED_TEXT(amount, request.refundMethod) }
            : status === "approved"
              ? { time: REFUND_REQUEST_TEXT.WAIT_REFUND, state: "current", text: REFUND_REQUEST_TEXT.WAIT_REFUND_TEXT }
              : { time: REFUND_REQUEST_TEXT.NO_VALUE, state: "todo", text: status === "rejected" ? REFUND_REQUEST_TEXT.NOT_DONE : REFUND_REQUEST_TEXT.AFTER_APPROVE };
    return [
        { key: "sent", title: REFUND_REQUEST_TEXT.STEP_SENT, time: clinicDateTime(request.createdAt), state: "done", text: REFUND_REQUEST_TEXT.SENT_TEXT },
        { key: "review", title: REFUND_REQUEST_TEXT.STEP_REVIEW, ...review },
        { key: "refund", title: REFUND_REQUEST_TEXT.STEP_REFUND, ...refund },
    ];
};

export const amountDigits = (value, { pasted = true } = {}) => {
    const text = String(value ?? "").normalize("NFKC");
    const trimmed = pasted ? text.replace(/\D+$/, "").replace(/[.,]\d{1,2}$/, "") : text;
    return trimmed.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
};

export const validateRefundForm = (form, invoice) => {
    const errors = {};
    if (!form.invoiceId) errors.invoiceId = REFUND_REQUEST_TEXT.ERR_INVOICE;
    const amount = Number(form.amount);
    const huge = form.amount.length > 15 || (Boolean(form.amount) && !Number.isSafeInteger(amount));
    if (!form.amount || (!huge && amount <= 0)) errors.amount = REFUND_REQUEST_TEXT.ERR_AMOUNT;
    else if (invoice && (huge || amount > invoice.maxRefundable)) errors.amount = REFUND_REQUEST_TEXT.ERR_AMOUNT_MAX(formatCurrency(invoice.maxRefundable));
    if (!form.reason.trim()) errors.reason = REFUND_REQUEST_TEXT.ERR_REASON;
    return errors;
};

export const resolveMaxError = (result, invoice, amount) => {
    const reported = result?.data?.maxRefundable;
    const fromServer = Number.isSafeInteger(reported);
    const max = fromServer ? Math.min(reported, invoice?.paidAmount ?? reported) : invoice?.maxRefundable;
    if (!Number.isFinite(max)) return { kind: "generic", max: null };
    if (max <= 0) return { kind: "reloadInvoices", max };
    if (max >= amount) return { kind: "generic", max };
    return { kind: "field", max };
};

export const isDefiniteRefundError = (code) => DEFINITE_ERRORS.has(code);

export const classifySubmitError = (result, invoice, amount) => {
    const code = result?.code;
    if (code === "AMOUNT_EXCEEDS_MAX") {
        const { kind, max } = resolveMaxError(result, invoice, amount);
        if (kind === "field") return { kind, fields: { amount: REFUND_REQUEST_TEXT.ERR_AMOUNT_MAX(formatCurrency(max)) }, max, uncertain: false };
        if (kind === "reloadInvoices") return { kind, form: REFUND_REQUEST_TEXT.ERR_NOT_ELIGIBLE, uncertain: false };
        return { kind, form: GENERIC_ERROR_MESSAGE, uncertain: false };
    }
    if (code === "VALIDATION_FAILED") {
        const errors = Array.isArray(result.errors) ? result.errors : [];
        const fields = errors.map((entry) => entry?.field);
        if (fields.includes("invoiceId")) return { kind: "reloadInvoices", form: REFUND_REQUEST_TEXT.ERR_NOT_ELIGIBLE, uncertain: false };
        if (fields.length && fields.every((field) => FIELD_KEYS.has(field))) {
            const messages = Object.fromEntries(errors.map((entry) => [entry.field, typeof entry.message === "string" && entry.message.trim() ? entry.message : fieldError(entry.field)]));
            return { kind: "field", fields: messages, uncertain: false };
        }
        return { kind: "generic", form: GENERIC_ERROR_MESSAGE, uncertain: false };
    }
    if (code === "OPEN_REQUEST_EXISTS") return { kind: "reloadInvoices", form: REFUND_REQUEST_TEXT.ERR_OPEN_REQUEST, uncertain: true };
    if (INVOICE_ERRORS.has(code)) return { kind: "reloadInvoices", form: REFUND_REQUEST_TEXT.ERR_NOT_ELIGIBLE, uncertain: false };
    return { kind: "generic", form: GENERIC_ERROR_MESSAGE, uncertain: true };
};

export const invoiceOptionLabel = (invoice) =>
    REFUND_REQUEST_TEXT.INVOICE_OPTION(invoice.date, invoice.stageLabel, invoice.itemNames.join(", "), formatCurrency(invoice.maxRefundable));

export const invoiceHint = (invoice) => {
    const held = invoice.paidAmount - invoice.maxRefundable;
    return REFUND_REQUEST_TEXT.AMOUNT_HINT(formatCurrency(invoice.maxRefundable), formatCurrency(invoice.paidAmount), held > 0 ? formatCurrency(held) : null);
};

export const refundLiveText = ({ view, hasData, live }) => {
    if (live) return live;
    if (!hasData) return "";
    if (view.missing) return REFUND_REQUEST_TEXT.NOT_FOUND_STATUS(view.query.request);
    if (!view.query.q && !view.query.status.length) return "";
    return view.list.length ? REFUND_REQUEST_TEXT.SHOWN_STATUS(view.list.length, view.total) : REFUND_REQUEST_TEXT.NO_RESULT_STATUS;
};
