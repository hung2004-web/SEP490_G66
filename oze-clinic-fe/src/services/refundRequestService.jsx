import { REFUND_REQUEST_STATUSES } from "../utils/data/mockRefundRequests";
import { normalizeText } from "../utils/format";
import api from "./api";
import { call } from "./receptionService";

// Manager side of refunds (api/refund-requests). The receptionist sends a request from "Thu tiền"; the amount is
// paid minus work done, and approving pays it back (status Processed). Backend statuses are mapped to the page's.

export const REFUND_REQUEST_PAGE_SIZE = 5;

// Fired after a decision, so the sidebar badge can count again.
export const REFUND_REQUESTS_CHANGED_EVENT = "app:refund-requests-changed";

// The backend does not link a refund to a doctor, so the page's doctor filter has no options
export const REFUND_DOCTOR_OPTIONS = [];

const statusFromApi = {
    Pending: REFUND_REQUEST_STATUSES.PENDING,
    Approved: REFUND_REQUEST_STATUSES.APPROVED,
    Processed: REFUND_REQUEST_STATUSES.REFUNDED,
    Rejected: REFUND_REQUEST_STATUSES.REJECTED,
};
const statusToApi = Object.fromEntries(Object.entries(statusFromApi).map(([backend, page]) => [page, backend]));

const toRequest = (item) => ({
    id: item.id,
    code: `RF${String(item.id).padStart(6, "0")}`,
    patientName: item.patientName ?? "",
    patientCode: item.patientCode ?? "",
    doctorName: "—",
    requestedByName: "Lễ tân",
    createdAt: item.createdAt,
    invoiceNumber: item.invoiceNumber ?? "",
    serviceNames: item.serviceNames ?? "—",
    treatmentContent: item.workDoneAmount != null ? `Phần đã làm: ${Number(item.workDoneAmount).toLocaleString("vi-VN")} ₫` : "—",
    paidAmount: Number(item.invoicePaidAmount ?? item.amount),
    refundAmount: Number(item.amount) - Number(item.workDoneAmount ?? 0),
    reason: item.reason,
    status: statusFromApi[item.status] ?? REFUND_REQUEST_STATUSES.PENDING,
    rejectReason: item.rejectionReason,
});

// Waiting requests first, then the latest.
const byPendingThenDate = (a, b) => {
    const pendingOrder = Number(b.status === REFUND_REQUEST_STATUSES.PENDING) - Number(a.status === REFUND_REQUEST_STATUSES.PENDING);
    return pendingOrder || b.createdAt.localeCompare(a.createdAt);
};

const loadAll = async (status) => {
    const result = await call(() => api.get("/api/refund-requests", { params: { status: statusToApi[status] } }));
    return result.success ? { ...result, data: result.data.map(toRequest).sort(byPendingThenDate) } : result;
};

// Search by the patient's name or code, or the invoice number (the list is small, filtered here)
export const getRefundRequests = async ({ page = 1, pageSize = REFUND_REQUEST_PAGE_SIZE, keyword = "", status = "" } = {}) => {
    const result = await loadAll(status);
    if (!result.success) return result;
    const search = normalizeText(keyword);
    const filtered = result.data.filter(
        (r) => !search || [r.patientName, r.patientCode, r.invoiceNumber].some((text) => normalizeText(text).includes(search)),
    );
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    return { ...result, data: { items: filtered.slice(start, start + pageSize), page: currentPage, pageSize, totalItems, totalPages } };
};

export const getRefundRequest = async (id) => {
    const result = await loadAll("");
    if (!result.success) return result;
    const request = result.data.find((r) => r.id === id);
    return request ? { ...result, data: request } : { success: false, message: "Không tìm thấy yêu cầu hoàn tiền.", data: null, errors: null };
};

// For the dashboard and the sidebar badge.
export const pendingRefundRequests = async () => {
    const result = await loadAll(REFUND_REQUEST_STATUSES.PENDING);
    return result.success ? result.data : [];
};

const notifyChanged = () => window.dispatchEvent(new CustomEvent(REFUND_REQUESTS_CHANGED_EVENT));

// Approving pays the money back at once (backend status Processed)
export const confirmRefundRequest = async (id) => {
    const result = await call(() => api.post(`/api/refund-requests/${id}/approve`));
    if (result.success) notifyChanged();
    return result.success ? { ...result, data: toRequest(result.data) } : result;
};

export const rejectRefundRequest = async ({ id, reason }) => {
    const result = await call(() => api.post(`/api/refund-requests/${id}/reject`, { rejectionReason: reason }));
    if (result.success) notifyChanged();
    return result.success ? { ...result, data: toRequest(result.data) } : result;
};
