import { LEAVE_REQUEST_STATUSES, MOCK_LEAVE_REQUESTS } from "../utils/data/mockShifts";
import { MOCK_STAFF } from "../utils/data/mockStaff";
import { normalizeText, parseDateOnly, toDateOnly } from "../utils/format";
import { USER_ROLES } from "../utils/messages";
import { SHIFT_ROLE_OPTIONS, applyApprovedLeave, displayName, leaveSubstitutes, mockDate } from "./shiftService";

// TODO(api): mock only, swap for the leave request endpoints once the backend has them.
// Decisions live in memory, so they last until the page is reloaded.
const MOCK_DELAY_MS = 300;

export const LEAVE_REQUEST_PAGE_SIZE = 5;

// The "Buổi" filter value of a whole-day request, whose slot is null.
export const WHOLE_DAY_FILTER = "whole-day";

// Fired after a decision, so the sidebar badge can count again.
export const LEAVE_REQUESTS_CHANGED_EVENT = "app:leave-requests-changed";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const staffById = (id) => MOCK_STAFF.find((member) => member.id === id);

const senderRoleLabel = (role) =>
    role === USER_ROLES.DENTAL_IMAGING_TECHNICIAN ? "KTV chụp X-quang" : SHIFT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "";

const daysBefore = (dateOnly, days) => {
    const date = parseDateOnly(dateOnly);
    return toDateOnly(new Date(date.getFullYear(), date.getMonth(), date.getDate() - days));
};

const substituteNameOf = (id) => (id ? displayName(staffById(id).fullName) : null);

const toRequest = ({ week, weekday, submittedDaysBefore, submittedTime, ...request }) => {
    const member = staffById(request.staffId);
    const date = mockDate({ week, weekday });
    return {
        ...request,
        date,
        role: member.role,
        senderName: displayName(member.fullName),
        senderRole: senderRoleLabel(member.role),
        substituteName: substituteNameOf(request.substituteId),
        submittedAt: `${daysBefore(date, submittedDaysBefore)}T${submittedTime}:00+07:00`,
    };
};

const requests = MOCK_LEAVE_REQUESTS.map(toRequest);

const requestById = (id) => requests.find((request) => request.id === id);

// Waiting requests first, then the latest leave day.
const byPendingThenDate = (a, b) => {
    const pendingOrder = Number(b.status === LEAVE_REQUEST_STATUSES.PENDING) - Number(a.status === LEAVE_REQUEST_STATUSES.PENDING);
    return pendingOrder || b.date.localeCompare(a.date);
};

// Search by the sender's name or the reason.
const matches = (request, { keyword = "", status = "", role = "", slot = "" }) => {
    const search = normalizeText(keyword);
    return (
        (!search || normalizeText(request.senderName).includes(search) || normalizeText(request.reason).includes(search)) &&
        (!status || request.status === status) &&
        (!role || request.role === role) &&
        (!slot || (request.slot ?? WHOLE_DAY_FILTER) === slot)
    );
};

export const getLeaveRequests = async ({ page = 1, pageSize = LEAVE_REQUEST_PAGE_SIZE, ...filters } = {}) => {
    await wait(MOCK_DELAY_MS);

    const filtered = requests.filter((request) => matches(request, filters)).sort(byPendingThenDate);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

// The request and, while it waits for a decision, who can take over.
export const getLeaveRequest = async (id) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    if (!request) return failure("Không tìm thấy đơn xin nghỉ.");

    const substituteOptions =
        request.status === LEAVE_REQUEST_STATUSES.PENDING
            ? leaveSubstitutes(request).map((member) => ({ value: String(member.id), label: member.fullName }))
            : [];
    return success({ request, substituteOptions });
};

// For the dashboard and the sidebar badge.
export const pendingLeaveRequests = () =>
    requests.filter((request) => request.status === LEAVE_REQUEST_STATUSES.PENDING).sort(byPendingThenDate);

const notifyChanged = () => window.dispatchEvent(new CustomEvent(LEAVE_REQUESTS_CHANGED_EVENT));

const ALREADY_DECIDED = "Đơn này đã được xử lý.";

// substituteId: a value from substituteOptions. TODO(api): the backend also moves the affected appointments to the substitute.
export const approveLeaveRequest = async ({ id, substituteId }) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    if (request?.status !== LEAVE_REQUEST_STATUSES.PENDING) return failure(ALREADY_DECIDED);

    const substitute = Number(substituteId);
    if (!leaveSubstitutes(request).some((member) => member.id === substitute)) return failure("Người thay không còn trống trong thời gian nghỉ.");

    request.status = LEAVE_REQUEST_STATUSES.APPROVED;
    request.substituteId = substitute;
    request.substituteName = substituteNameOf(substitute);
    applyApprovedLeave({ requestId: id, staffId: request.staffId, date: request.date, slot: request.slot, substituteId: substitute });
    notifyChanged();
    return success(request, "Đã duyệt đơn xin nghỉ.");
};

export const rejectLeaveRequest = async ({ id, reason }) => {
    await wait(MOCK_DELAY_MS);

    const request = requestById(id);
    if (request?.status !== LEAVE_REQUEST_STATUSES.PENDING) return failure(ALREADY_DECIDED);

    request.status = LEAVE_REQUEST_STATUSES.REJECTED;
    request.rejectReason = reason;
    notifyChanged();
    return success(request, "Đã từ chối đơn xin nghỉ.");
};
