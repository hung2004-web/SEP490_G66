import { MOCK_REFUND_REQUESTS, REFUND_REQUEST_STATUSES } from "../utils/data/mockRefundRequests";
import { MOCK_STAFF } from "../utils/data/mockStaff";
import { normalizeText } from "../utils/format";

// TODO(api): mock only, swap for the refund request endpoints once the backend has them.
// Decisions live in memory, so they last until the page is reloaded.
const MOCK_DELAY_MS = 300;

export const REFUND_REQUEST_PAGE_SIZE = 5;

// Fired after a decision, so the sidebar badge can count again.
export const REFUND_REQUESTS_CHANGED_EVENT = "app:refund-requests-changed";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const staffName = (id) => MOCK_STAFF.find((member) => member.id === id).fullName;

const requests = MOCK_REFUND_REQUESTS.map((request) => ({
    ...request,
    doctorName: staffName(request.doctorId),
    requestedByName: staffName(request.requestedById),
}));

// The doctors who have a request, for the "Bác sĩ phụ trách" filter.
export const REFUND_DOCTOR_OPTIONS = MOCK_STAFF.filter((member) => requests.some((request) => request.doctorId === member.id)).map((member) => ({
    value: String(member.id),
    label: member.fullName,
}));

const requestById = (id) => requests.find((request) => request.id === id);

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

    const filtered = requests.filter((request) => matches(request, filters)).sort(byPendingThenDate);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

export const getRefundRequest = async (id) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    return request ? success(request) : failure("Không tìm thấy yêu cầu hoàn tiền.");
};

// For the dashboard and the sidebar badge.
export const pendingRefundRequests = () =>
    requests.filter((request) => request.status === REFUND_REQUEST_STATUSES.PENDING).sort(byPendingThenDate);

const notifyChanged = () => window.dispatchEvent(new CustomEvent(REFUND_REQUESTS_CHANGED_EVENT));

const ALREADY_DECIDED = "Yêu cầu này đã được xử lý.";

// The manager's decision only approves the request; it becomes "Đã hoàn tiền" once the money is paid back.
export const confirmRefundRequest = async (id) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    if (request?.status !== REFUND_REQUEST_STATUSES.PENDING) return failure(ALREADY_DECIDED);

    request.status = REFUND_REQUEST_STATUSES.APPROVED;
    notifyChanged();
    return success(request, "Đã xác nhận hoàn tiền.");
};

export const rejectRefundRequest = async ({ id, reason }) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    if (request?.status !== REFUND_REQUEST_STATUSES.PENDING) return failure(ALREADY_DECIDED);

    request.status = REFUND_REQUEST_STATUSES.REJECTED;
    request.rejectReason = reason;
    notifyChanged();
    return success(request, "Đã từ chối yêu cầu hoàn tiền.");
};
