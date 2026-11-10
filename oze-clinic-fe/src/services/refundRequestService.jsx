import { getMockCurrentUser } from "../utils/data/mockData";
import { buildMedicalRecordData } from "../utils/data/mockMedicalRecord";
import { MOCK_DASHBOARD_PATIENT_ID } from "../utils/data/mockPatientDashboard";
import { buildPatientDebtMock } from "../utils/data/mockPatientDebts";
import { MOCK_PATIENT_REFUND_REQUESTS, MOCK_REFUND_REQUESTS, REFUND_REQUEST_STATUSES } from "../utils/data/mockRefundRequests";
import { MOCK_STAFF } from "../utils/data/mockStaff";
import { normalizeText } from "../utils/format";
import { GENERIC_ERROR_MESSAGE } from "../utils/messages";
import {
    REFUND_REASON_MAX,
    fromApiRequest,
    isDefiniteRefundError,
    nextCode,
    nextId,
    normalizeInvoiceList,
    normalizeRefundList,
    randomId,
    toApiRequest,
    toClinicIso,
} from "../utils/refundRequest";
import { readMockMode } from "./patientDashboardService";

// TODO(api): mock only, swap for the refund request endpoints once the backend has them.
// Decisions live in memory, so they last until the page is reloaded.
const MOCK_DELAY_MS = 300;
const CREATE_DELAY_MS = 600;
const KEY_TTL_MS = 24 * 60 * 60 * 1000;
const SUBMIT_SWITCH_KEY = "mock_refund_submit";
const INVOICES_SWITCH_KEY = "mock_refund_invoices";

export const REFUND_REQUEST_PAGE_SIZE = 5;

export const REFUND_REQUESTS_CHANGED_EVENT = "app:refund-requests-changed";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, code: null, data, errors: null });

const failure = (message, { code = null, data = null, errors = null } = {}) => ({ success: false, message, code, data, errors });

const abortError = () => new DOMException("Aborted", "AbortError");

const staffName = (id) => MOCK_STAFF.find((member) => member.id === id)?.fullName ?? null;

const { PENDING, REJECTED } = REFUND_REQUEST_STATUSES;

const store = [
    ...MOCK_REFUND_REQUESTS.map((request) => ({ ...request, scope: "admin" })),
    ...MOCK_PATIENT_REFUND_REQUESTS.map((request) => ({ ...request, scope: "patient", origin: "seed" })),
];

const idempotencyKeys = new Map();
const droppedInvoices = new Set();
const omitOnce = new Set();

const devHooks = () => {
    if (!import.meta.env?.DEV || typeof window === "undefined") return null;
    const hooks = ((window.__ozeMock ??= {}).refund ??= {});
    hooks.list ??= 0;
    hooks.invoices ??= 0;
    hooks.create ??= 0;
    return hooks;
};

const dateToIso = (date) => `${date.slice(6)}-${date.slice(3, 5)}-${date.slice(0, 2)}`;

const sumPayments = (receipt) => (receipt?.payments ?? []).reduce((total, payment) => total + payment.amount, 0);

const deriveContext = (mode) => {
    const record = buildMedicalRecordData(mode);
    const debt = buildPatientDebtMock(mode);
    const stages = new Map();
    Object.keys(debt.stageReceipts)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((planId) => {
            Object.entries(debt.stageReceipts[planId]).forEach(([label, visitId]) => {
                if (!stages.has(visitId)) stages.set(visitId, label);
            });
        });
    return { record, receipts: debt.receipts, stages, visits: new Map(record.visits.map((visit) => [visit.id, visit])) };
};

const derivedFields = (visitId, context) => {
    const receipt = context.receipts[visitId];
    const firstPayment = receipt?.payments?.[0];
    return {
        stageLabel: context.stages.get(visitId) ?? null,
        itemNames: receipt ? receipt.lines.map((line) => line.name) : [],
        paidAt: firstPayment ? `${dateToIso(firstPayment.date)}T00:00:00+07:00` : null,
        doctorName: context.visits.get(visitId)?.doctor ?? null,
    };
};

const toAdminView = (request, context) => {
    if (request.scope !== "patient") {
        return { ...request, doctorName: staffName(request.doctorId), requestedByName: staffName(request.requestedById) };
    }
    const receipt = context.receipts[request.visitId];
    const { itemNames, doctorName } = derivedFields(request.visitId, context);
    const doctor = MOCK_STAFF.find((member) => member.fullName === doctorName);
    const patientName = context.record.profile?.name ?? null;
    return {
        ...request,
        patientName,
        patientCode: context.record.patient?.code ?? null,
        invoiceNumber: "—",
        serviceNames: itemNames.join(" · "),
        treatmentContent: receipt ? receipt.lines.map((line) => line.detail).join(" · ") : "",
        paidAmount: sumPayments(receipt),
        doctorId: doctor?.id ?? null,
        doctorName,
        requestedById: null,
        requestedByName: patientName,
    };
};

const adminContext = () => deriveContext(readMockMode());

const adminViews = () => {
    const context = adminContext();
    return store.map((request) => toAdminView(request, context));
};

// The doctors who have a request, for the "Bác sĩ phụ trách" filter.
export const getRefundDoctorOptions = () => {
    const views = adminViews();
    return MOCK_STAFF.filter((member) => views.some((request) => request.doctorId === member.id)).map((member) => ({
        value: String(member.id),
        label: member.fullName,
    }));
};

const requestById = (id) => store.find((request) => request.id === id);

// Waiting requests first, then the latest.
const byPendingThenDate = (a, b) => {
    const pendingOrder = Number(b.status === REFUND_REQUEST_STATUSES.PENDING) - Number(a.status === REFUND_REQUEST_STATUSES.PENDING);
    return pendingOrder || b.createdAt.localeCompare(a.createdAt);
};

// Search by the patient's name or code, or the invoice number.
const matches = (request, { keyword = "", status = "", doctorId = "" }) => {
    const search = normalizeText(keyword);
    return (
        (!search ||
            normalizeText(request.patientName).includes(search) ||
            normalizeText(request.patientCode).includes(search) ||
            normalizeText(request.invoiceNumber).includes(search)) &&
        (!status || request.status === status) &&
        (!doctorId || String(request.doctorId) === doctorId)
    );
};

export const getRefundRequests = async ({ page = 1, pageSize = REFUND_REQUEST_PAGE_SIZE, ...filters } = {}) => {
    await wait(MOCK_DELAY_MS);

    const filtered = adminViews()
        .filter((request) => matches(request, filters))
        .sort(byPendingThenDate);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return success(structuredClone({ items, page: currentPage, pageSize, totalItems, totalPages }));
};

export const getRefundRequest = async (id) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    return request ? success(structuredClone(toAdminView(request, adminContext()))) : failure("Không tìm thấy yêu cầu hoàn tiền.");
};

// For the dashboard and the sidebar badge.
export const pendingRefundRequests = () =>
    structuredClone(
        adminViews()
            .filter((request) => request.status === REFUND_REQUEST_STATUSES.PENDING)
            .sort(byPendingThenDate),
    );

const notifyChanged = () => {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") window.dispatchEvent(new CustomEvent(REFUND_REQUESTS_CHANGED_EVENT));
};

const ALREADY_DECIDED = "Yêu cầu này đã được xử lý.";

// The manager's decision only approves the request; it becomes "Đã hoàn tiền" once the money is paid back.
export const confirmRefundRequest = async (id) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    if (request?.status !== REFUND_REQUEST_STATUSES.PENDING) return failure(ALREADY_DECIDED);

    request.status = REFUND_REQUEST_STATUSES.APPROVED;
    request.approvedAt = toClinicIso(new Date());
    notifyChanged();
    return success(structuredClone(toAdminView(request, adminContext())), "Đã xác nhận hoàn tiền.");
};

export const rejectRefundRequest = async ({ id, reason }) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    if (request?.status !== REFUND_REQUEST_STATUSES.PENDING) return failure(ALREADY_DECIDED);

    request.status = REFUND_REQUEST_STATUSES.REJECTED;
    request.rejectReason = reason;
    request.approvedAt = toClinicIso(new Date());
    notifyChanged();
    return success(structuredClone(toAdminView(request, adminContext())), "Đã từ chối yêu cầu hoàn tiền.");
};

const currentUserId = () => getMockCurrentUser()?.id ?? null;

const patientRequests = (userId) => store.filter((request) => request.scope === "patient" && request.patientUserId === userId);

const toPatientDto = (request, context) => toApiRequest({ ...request, ...derivedFields(request.visitId, context) });

const invoiceDtos = (context, userId) => {
    const requests = patientRequests(userId);
    return Object.keys(context.receipts)
        .map(Number)
        .map((invoiceId) => {
            const visit = context.visits.get(invoiceId);
            const paidAmount = sumPayments(context.receipts[invoiceId]);
            const held = requests.filter((request) => request.visitId === invoiceId && request.status !== REJECTED).reduce((total, request) => total + request.amount, 0);
            const open = requests.some((request) => request.visitId === invoiceId && request.status === PENDING);
            return { visit, paidAmount, maxRefundable: paidAmount - held, open, invoiceId };
        })
        .filter(({ visit, paidAmount, maxRefundable, open, invoiceId }) => visit && paidAmount > 0 && maxRefundable > 0 && !open && !droppedInvoices.has(invoiceId))
        .map(({ visit, paidAmount, maxRefundable, invoiceId }) => ({
            invoiceId,
            invoiceDate: dateToIso(visit.date),
            ...derivedFields(invoiceId, context),
            paidAmount,
            maxRefundable,
        }));
};

export const getMyRefundRequests = async ({ signal } = {}) => {
    await wait(MOCK_DELAY_MS);
    if (signal?.aborted) throw abortError();
    const hooks = devHooks();
    if (hooks) hooks.list += 1;
    const mode = readMockMode();
    if (mode === "error") return failure(GENERIC_ERROR_MESSAGE);
    const userId = currentUserId();
    const own = userId === MOCK_DASHBOARD_PATIENT_ID ? patientRequests(userId) : [];
    const visible = (mode === "empty" ? own.filter((request) => request.origin === "session") : own).filter((request) => !omitOnce.has(request.code));
    omitOnce.clear();
    const context = deriveContext(mode);
    const items = visible.map((request) => toPatientDto(request, context));
    const list = normalizeRefundList({ items, totalItems: items.length });
    return list ? success({ items: list, totalItems: list.length }) : failure(GENERIC_ERROR_MESSAGE);
};

export const getMyRefundableInvoices = async ({ signal, source = "page" } = {}) => {
    await wait(MOCK_DELAY_MS);
    if (signal?.aborted) throw abortError();
    const hooks = devHooks();
    if (hooks) hooks.invoices += 1;
    const mode = readMockMode();
    const forced = readMockMode(INVOICES_SWITCH_KEY);
    if (mode === "error" || (forced === "modal-error" && source === "modal") || (forced === "page-error" && source === "page")) return failure(GENERIC_ERROR_MESSAGE);
    const userId = currentUserId();
    if (userId !== MOCK_DASHBOARD_PATIENT_ID || mode === "empty" || (forced === "modal-empty" && source === "modal")) return success([]);
    const list = normalizeInvoiceList({ items: invoiceDtos(deriveContext(mode), userId) });
    return list ? success(list) : failure(GENERIC_ERROR_MESSAGE);
};

const forcedFailures = {
    AMOUNT_EXCEEDS_MAX: () => failure(GENERIC_ERROR_MESSAGE, { code: "AMOUNT_EXCEEDS_MAX", data: { maxRefundable: 50000 } }),
    AMOUNT_EXCEEDS_MAX_0: () => failure(GENERIC_ERROR_MESSAGE, { code: "AMOUNT_EXCEEDS_MAX", data: { maxRefundable: 0 } }),
    AMOUNT_EXCEEDS_MAX_NODATA: () => failure(GENERIC_ERROR_MESSAGE, { code: "AMOUNT_EXCEEDS_MAX" }),
    OPEN_REQUEST_EXISTS: () => failure(GENERIC_ERROR_MESSAGE, { code: "OPEN_REQUEST_EXISTS" }),
    INVOICE_NOT_ELIGIBLE: () => failure(GENERIC_ERROR_MESSAGE, { code: "INVOICE_NOT_ELIGIBLE" }),
    INVOICE_NOT_FOUND: () => failure(GENERIC_ERROR_MESSAGE, { code: "INVOICE_NOT_FOUND" }),
    INVOICE_IS_DEPOSIT: () => failure(GENERIC_ERROR_MESSAGE, { code: "INVOICE_IS_DEPOSIT" }),
    VALIDATION_FAILED: () => failure(GENERIC_ERROR_MESSAGE, { code: "VALIDATION_FAILED", errors: [{ field: "amount" }, { field: "reason" }] }),
    VALIDATION_FAILED_INVOICE: () => failure(GENERIC_ERROR_MESSAGE, { code: "VALIDATION_FAILED", errors: [{ field: "invoiceId" }] }),
    VALIDATION_FAILED_UNKNOWN: () => failure(GENERIC_ERROR_MESSAGE, { code: "VALIDATION_FAILED", errors: [{ field: "foo" }] }),
    GENERIC: () => failure(GENERIC_ERROR_MESSAGE),
};

const validateBody = ({ invoiceId, amount, reason }) => {
    const errors = [];
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) errors.push({ field: "invoiceId" });
    if (!Number.isSafeInteger(amount) || amount <= 0) errors.push({ field: "amount" });
    if (typeof reason !== "string" || !reason.trim() || reason.length > REFUND_REASON_MAX) errors.push({ field: "reason" });
    return errors;
};

const createRecord = (body, userId) => {
    const created = {
        id: nextId(store.map((request) => request.id)),
        code: nextCode(store.map((request) => request.code)),
        scope: "patient",
        origin: "session",
        patientUserId: userId,
        visitId: body.invoiceId,
        amount: body.amount,
        status: PENDING,
        requestType: "Refund",
        createdAt: toClinicIso(new Date()),
        approvedAt: null,
        processedAt: null,
        refundMethod: null,
        reason: body.reason,
        rejectReason: null,
    };
    store.push(created);
    return created;
};

const submitMock = (body, mode, userId) => {
    if (mode === "error") return failure(GENERIC_ERROR_MESSAGE);
    if (mode === "empty" || userId !== MOCK_DASHBOARD_PATIENT_ID) return failure(GENERIC_ERROR_MESSAGE, { code: "INVOICE_NOT_ELIGIBLE" });
    const forced = readMockMode(SUBMIT_SWITCH_KEY);
    if (forced === "REJECT") throw new TypeError("Network error");
    if (forced === "OPEN_REQUEST_EXISTS_DROP") {
        droppedInvoices.add(body.invoiceId);
        return forcedFailures.OPEN_REQUEST_EXISTS();
    }
    if (Object.hasOwn(forcedFailures, forced)) return forcedFailures[forced]();
    const errors = validateBody(body);
    if (errors.length) return failure(GENERIC_ERROR_MESSAGE, { code: "VALIDATION_FAILED", errors });
    const context = deriveContext(mode);
    if (!context.receipts[body.invoiceId] || !context.visits.has(body.invoiceId)) return failure(GENERIC_ERROR_MESSAGE, { code: "INVOICE_NOT_FOUND" });
    const requests = patientRequests(userId);
    if (requests.some((request) => request.visitId === body.invoiceId && request.status === PENDING)) return forcedFailures.OPEN_REQUEST_EXISTS();
    const invoice = invoiceDtos(context, userId).find((entry) => entry.invoiceId === body.invoiceId);
    if (!invoice) return failure(GENERIC_ERROR_MESSAGE, { code: "INVOICE_NOT_ELIGIBLE" });
    if (body.amount > invoice.maxRefundable) return failure(GENERIC_ERROR_MESSAGE, { code: "AMOUNT_EXCEEDS_MAX", data: { maxRefundable: invoice.maxRefundable } });
    const created = createRecord(body, userId);
    if (forced === "OMIT_CREATED") omitOnce.add(created.code);
    notifyChanged();
    const dto = toPatientDto(created, context);
    return success(fromApiRequest(forced === "BAD_CODE" ? { ...dto, code: "X" } : dto));
};

const takeKey = (content, now) => {
    idempotencyKeys.forEach((entry, key) => {
        if (now - entry.at > KEY_TTL_MS) idempotencyKeys.delete(key);
    });
    const entry = idempotencyKeys.get(content) ?? { key: randomId(), at: now };
    idempotencyKeys.set(content, entry);
    return entry.key;
};

const settleKey = (content, result) => {
    if (result?.success || (result && isDefiniteRefundError(result.code))) idempotencyKeys.delete(content);
};

export const createMyRefundRequest = async ({ invoiceId, amount, reason }, { signal } = {}) => {
    const body = { invoiceId, amount, reason: typeof reason === "string" ? reason.normalize("NFC").trim() : reason };
    const userId = currentUserId();
    const content = JSON.stringify([userId, body.invoiceId, body.amount, body.reason]);
    const key = takeKey(content, Date.now());
    const hooks = devHooks();
    if (hooks) hooks.lastKey = key;
    await wait(CREATE_DELAY_MS);
    if (hooks?.hold) await hooks.hold;
    if (signal?.aborted) throw abortError();
    let result;
    try {
        result = submitMock(body, readMockMode(), userId);
        return result;
    } finally {
        const after = devHooks();
        if (after) after.create += 1;
        settleKey(content, result);
    }
};
