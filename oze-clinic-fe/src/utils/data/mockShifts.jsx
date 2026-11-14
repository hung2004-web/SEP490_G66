// Mock data for the clinic manager's "Phân ca" page.
// TODO(api): the backend has no work shift endpoints yet.

import { LEAVE_REQUEST_STATUSES, SHIFT_SLOTS } from "@/utils/shift";

export const SHIFT_STATUSES = {
    PRESENT: "present",
    ABSENT: "absent",
    LEAVE: "leave",
    // Assigned, but the shift has not started yet.
    PENDING: "pending",
    UNASSIGNED: "unassigned",
};

export const SHIFT_STATUS_OPTIONS = [
    { value: SHIFT_STATUSES.PRESENT, label: "Có mặt" },
    { value: SHIFT_STATUSES.ABSENT, label: "Vắng" },
    { value: SHIFT_STATUSES.LEAVE, label: "Nghỉ" },
    { value: SHIFT_STATUSES.PENDING, label: "Chưa điểm danh" },
    { value: SHIFT_STATUSES.UNASSIGNED, label: "Chưa phân ca" },
];

// Usual staff (MOCK_STAFF ids) of each room (MOCK_ROOMS ids) per slot, used to fill every week.
export const MOCK_SHIFT_TEMPLATE = {
    1: { [SHIFT_SLOTS.MORNING]: 12, [SHIFT_SLOTS.AFTERNOON]: 30 },
    2: { [SHIFT_SLOTS.MORNING]: 18, [SHIFT_SLOTS.AFTERNOON]: 18 },
    3: { [SHIFT_SLOTS.MORNING]: 15, [SHIFT_SLOTS.AFTERNOON]: 15 },
    4: { [SHIFT_SLOTS.MORNING]: 21, [SHIFT_SLOTS.AFTERNOON]: 33 },
    6: { [SHIFT_SLOTS.MORNING]: 24, [SHIFT_SLOTS.AFTERNOON]: 36 },
};

// The entries below are placed relative to today: week 0 = this week, 1 = next week; weekday 0 = Monday ... 6 = Sunday.

const KHOA_APPOINTMENTS = [
    { id: 1, time: "08:30", patientName: "Phạm Minh Tuấn", serviceName: "Khám tổng quát" },
    { id: 2, time: "09:30", patientName: "Vũ Đức Long", serviceName: "Điều trị tủy" },
    { id: 3, time: "14:00", patientName: "Lê Hoàng Yến", serviceName: "Trám răng" },
];

const ANH_APPOINTMENTS = [
    { id: 4, time: "08:00", patientName: "Nguyễn Thu Hằng", serviceName: "Lấy cao răng" },
    { id: 5, time: "10:30", patientName: "Đoàn Văn Sơn", serviceName: "Nhổ răng khôn" },
];

// slot null = the whole day. submittedDaysBefore: sent that many days before the leave day, at submittedTime.
// substituteId: the person chosen when approving; null on the two requests whose shifts still need someone on "Phân ca".
export const MOCK_LEAVE_REQUESTS = [
    { id: 1, staffId: 12, week: 0, weekday: 4, slot: null, reason: "Đưa con đi khám", status: LEAVE_REQUEST_STATUSES.APPROVED, substituteId: null, rejectReason: null, submittedDaysBefore: 21, submittedTime: "09:05", affectedAppointments: [] },
    { id: 2, staffId: 12, week: 1, weekday: 4, slot: null, reason: "Việc gia đình", status: LEAVE_REQUEST_STATUSES.APPROVED, substituteId: null, rejectReason: null, submittedDaysBefore: 21, submittedTime: "09:10", affectedAppointments: KHOA_APPOINTMENTS },
    { id: 6, staffId: 30, week: 1, weekday: 1, slot: SHIFT_SLOTS.MORNING, reason: "Khám thai định kỳ", status: LEAVE_REQUEST_STATUSES.PENDING, substituteId: null, rejectReason: null, submittedDaysBefore: 14, submittedTime: "10:20", affectedAppointments: ANH_APPOINTMENTS },
    { id: 7, staffId: 24, week: 1, weekday: 0, slot: SHIFT_SLOTS.AFTERNOON, reason: "Khám sức khoẻ định kỳ", status: LEAVE_REQUEST_STATUSES.PENDING, substituteId: null, rejectReason: null, submittedDaysBefore: 14, submittedTime: "16:40", affectedAppointments: [] },
    { id: 8, staffId: 21, week: 0, weekday: 6, slot: SHIFT_SLOTS.MORNING, reason: "Phẫu thuật nhỏ, có giấy hẹn", status: LEAVE_REQUEST_STATUSES.PENDING, substituteId: null, rejectReason: null, submittedDaysBefore: 14, submittedTime: "07:55", affectedAppointments: [] },
    { id: 9, staffId: 12, week: -2, weekday: 4, slot: null, reason: "Việc gia đình", status: LEAVE_REQUEST_STATUSES.REJECTED, substituteId: null, rejectReason: "Chưa có bác sĩ thay thế trong ngày.", submittedDaysBefore: 6, submittedTime: "08:12", affectedAppointments: KHOA_APPOINTMENTS },
    { id: 10, staffId: 15, week: -3, weekday: 0, slot: null, reason: "Hội thảo chuyên môn", status: LEAVE_REQUEST_STATUSES.APPROVED, substituteId: 12, rejectReason: null, submittedDaysBefore: 10, submittedTime: "14:30", affectedAppointments: [] },
    { id: 11, staffId: 36, week: -4, weekday: 2, slot: SHIFT_SLOTS.AFTERNOON, reason: "Việc cá nhân", status: LEAVE_REQUEST_STATUSES.APPROVED, substituteId: 45, rejectReason: null, submittedDaysBefore: 5, submittedTime: "11:00", affectedAppointments: [] },
];

// The requests that take a person off their shifts.
export const MOCK_LEAVES = MOCK_LEAVE_REQUESTS.filter((request) => request.status === LEAVE_REQUEST_STATUSES.APPROVED).map(
    ({ id, staffId, week, weekday, slot, status }) => ({ requestId: id, staffId, week, weekday, slot, status }),
);

// Shifts nobody was put on.
export const MOCK_UNASSIGNED = [
    { week: 0, weekday: 5, slot: SHIFT_SLOTS.MORNING, roomId: 2 },
    { week: 0, weekday: 2, slot: SHIFT_SLOTS.AFTERNOON, roomId: 3 },
    { week: 0, weekday: 6, slot: SHIFT_SLOTS.AFTERNOON, roomId: 6 },
    { week: 1, weekday: 5, slot: SHIFT_SLOTS.MORNING, roomId: 2 },
    { week: 1, weekday: 2, slot: SHIFT_SLOTS.AFTERNOON, roomId: 3 },
    { week: 1, weekday: 6, slot: SHIFT_SLOTS.AFTERNOON, roomId: 6 },
];

// Shifts the staff member missed (only shown once the shift is over).
export const MOCK_ABSENCES = [
    { week: 0, weekday: 0, slot: SHIFT_SLOTS.AFTERNOON, roomId: 4, reason: "Ốm, báo qua điện thoại lúc 12:15" },
    { week: 0, weekday: 1, slot: SHIFT_SLOTS.MORNING, roomId: 4, reason: "Xe hỏng giữa đường, báo lúc 08:20" },
];
