import api from "./api";
import { call } from "./receptionService";

// The signed-in staff member's own shifts and leave requests (api/schedules/my, api/leave-requests/my).

export const LEAVE_SLOTS = [
    { value: "", label: "Cả ngày" },
    { value: "Morning", label: "Ca sáng" },
    { value: "Afternoon", label: "Ca chiều" },
];

export const leaveSlotText = (slot) => LEAVE_SLOTS.find((option) => option.value === (slot ?? ""))?.label ?? "";

export const LEAVE_STATUS = {
    Pending: { label: "Chờ duyệt", badge: "badge-warning" },
    Approved: { label: "Đã duyệt", badge: "badge-success" },
    Rejected: { label: "Từ chối", badge: "badge-danger" },
    Cancelled: { label: "Đã rút", badge: "badge-neutral" },
};

// A shift starting before 12:00 belongs to the morning, the same rule as the backend
export const slotOfShift = (shiftStart) => (shiftStart < "12:00" ? "Morning" : "Afternoon");

export const getMyShifts = ({ fromDate, toDate }) => call(() => api.get("/api/schedules/my", { params: { fromDate, toDate } }));

export const getMyLeaveRequests = ({ page = 1, pageSize = 20 } = {}) =>
    call(() => api.get("/api/leave-requests/my", { params: { pageNumber: page, pageSize } }));

export const createLeaveRequest = ({ leaveDate, slot, reason }) => call(() => api.post("/api/leave-requests", { leaveDate, slot: slot || null, reason }));

export const cancelLeaveRequest = (id) => call(() => api.post(`/api/leave-requests/${id}/cancel`));

// Clock in / clock out on one of the signed-in staff member's own shifts of today (any role)
export const startMyShift = (shiftId) => call(() => api.post(`/api/schedules/my/${shiftId}/start`));

export const endMyShift = (shiftId) => call(() => api.post(`/api/schedules/my/${shiftId}/end`));
