import { LEAVE_REQUEST_STATUSES } from "../utils/data/mockShifts";
import { BACKEND_ROLE_NAMES } from "../utils/messages";
import api from "./api";
import { call } from "./receptionService";
import { SHIFT_ROLE_OPTIONS } from "./shiftService";

// Manager side of leave requests (api/leave-requests). The backend uses Pending/Approved/Rejected/Cancelled and
// Morning/Afternoon/null; the page keeps its own lower-case values, so both are converted here.

export const LEAVE_REQUEST_PAGE_SIZE = 5;

// The "Buổi" filter value of a whole-day request, whose slot is null.
export const WHOLE_DAY_FILTER = "whole-day";

// Fired after a decision, so the sidebar badge can count again.
export const LEAVE_REQUESTS_CHANGED_EVENT = "app:leave-requests-changed";

const SLOT_TO_API = { morning: "Morning", afternoon: "Afternoon", [WHOLE_DAY_FILTER]: "WholeDay" };
const SLOT_FROM_API = { Morning: "morning", Afternoon: "afternoon" };
const STATUS_TO_API = {
    [LEAVE_REQUEST_STATUSES.PENDING]: "Pending",
    [LEAVE_REQUEST_STATUSES.APPROVED]: "Approved",
    [LEAVE_REQUEST_STATUSES.REJECTED]: "Rejected",
};
const STATUS_FROM_API = Object.fromEntries(Object.entries(STATUS_TO_API).map(([page, backend]) => [backend, page]));

const roleFromBackend = (backendRole) => Object.keys(BACKEND_ROLE_NAMES).find((key) => BACKEND_ROLE_NAMES[key] === backendRole) ?? "";

const roleLabel = (role) => SHIFT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "";

const toRequest = (item) => {
    const role = roleFromBackend(item.staffRole);
    return {
        id: item.id,
        date: item.leaveDate,
        slot: SLOT_FROM_API[item.slot] ?? null,
        reason: item.reason,
        // A withdrawn request has no page status of its own; it never needs a decision any more
        status: STATUS_FROM_API[item.status] ?? LEAVE_REQUEST_STATUSES.REJECTED,
        role,
        senderName: item.staffName,
        senderRole: roleLabel(role),
        substituteId: item.substituteStaffUserId,
        substituteName: item.substituteName,
        rejectReason: item.status === "Cancelled" ? "Nhân viên đã rút đơn." : item.rejectionReason,
        submittedAt: item.createdAt,
        affectedAppointments: (item.affectedAppointments ?? []).map((appointment) => ({
            id: appointment.id,
            time: appointment.time?.slice(0, 5) ?? "",
            patientName: appointment.patientName,
            serviceName: appointment.serviceName,
        })),
    };
};

const mapResult = (result, mapData) => (result.success ? { ...result, data: mapData(result.data) } : result);

export const getLeaveRequests = async ({ page = 1, pageSize = LEAVE_REQUEST_PAGE_SIZE, keyword = "", status = "", role = "", slot = "" } = {}) => {
    const result = await call(() =>
        api.get("/api/leave-requests", {
            params: {
                pageNumber: page,
                pageSize,
                searchKeyword: keyword || undefined,
                status: STATUS_TO_API[status],
                role: BACKEND_ROLE_NAMES[role],
                slot: SLOT_TO_API[slot],
            },
        }),
    );
    return mapResult(result, (data) => ({
        items: data.items.map(toRequest),
        page: data.pageNumber,
        pageSize: data.pageSize,
        totalItems: data.totalCount,
        totalPages: Math.max(1, data.totalPages),
    }));
};

// The request and, while it waits for a decision, who can take over.
export const getLeaveRequest = async (id) => {
    const result = await call(() => api.get(`/api/leave-requests/${id}`));
    return mapResult(result, (data) => ({
        request: toRequest(data.request),
        substituteOptions: data.substituteOptions.map((option) => ({ value: option.staffUserId, label: option.fullName })),
    }));
};

// For the dashboard and the sidebar badge.
export const pendingLeaveRequests = async () => {
    const result = await getLeaveRequests({ status: LEAVE_REQUEST_STATUSES.PENDING, pageSize: 100 });
    return result.success ? result.data.items : [];
};

const notifyChanged = () => window.dispatchEvent(new CustomEvent(LEAVE_REQUESTS_CHANGED_EVENT));

// substituteId: a value from substituteOptions (the substitute's user id). Empty is allowed when no patient is booked;
// with a substitute the backend moves the shifts and the booked appointments to that person.
export const approveLeaveRequest = async ({ id, substituteId }) => {
    const result = await call(() => api.post(`/api/leave-requests/${id}/approve`, { substituteStaffUserId: substituteId || null }));
    if (result.success) notifyChanged();
    return mapResult(result, toRequest);
};

export const rejectLeaveRequest = async ({ id, reason }) => {
    const result = await call(() => api.post(`/api/leave-requests/${id}/reject`, { reason }));
    if (result.success) notifyChanged();
    return mapResult(result, toRequest);
};
