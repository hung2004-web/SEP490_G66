// Mock data for the clinic manager's "Phân ca" page.
// TODO(api): the backend has no work shift endpoints yet.

export const SHIFT_SLOTS = {
    MORNING: "morning",
    AFTERNOON: "afternoon",
};

export const SHIFT_SLOT_OPTIONS = [
    { value: SHIFT_SLOTS.MORNING, label: "Ca sáng", start: "08:00", end: "12:00" },
    { value: SHIFT_SLOTS.AFTERNOON, label: "Ca chiều", start: "13:00", end: "17:00" },
];

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

export const LEAVE_REQUEST_STATUSES = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
};

// Only approved requests take a person off a shift.
export const LEAVE_REQUEST_STATUS_LABELS = {
    [LEAVE_REQUEST_STATUSES.PENDING]: { label: "Chờ duyệt", badge: "badge-warning" },
    [LEAVE_REQUEST_STATUSES.APPROVED]: { label: "Đã duyệt", badge: "badge-success" },
    [LEAVE_REQUEST_STATUSES.REJECTED]: { label: "Từ chối", badge: "badge-danger" },
};

// The part of the day a leave request covers. slot null = the whole day.
export const LEAVE_SLOT_OPTIONS = [{ value: null, label: "Cả ngày" }, ...SHIFT_SLOT_OPTIONS];

export const leaveSlotLabel = (slot) => LEAVE_SLOT_OPTIONS.find((option) => option.value === slot)?.label ?? "";

// The entries below are placed relative to today: week 0 = this week, 1 = next week; weekday 0 = Monday ... 6 = Sunday.

// Leave requests that take a person off their shifts. slot null = the whole day.
export const MOCK_LEAVES = [
    { requestId: 1, staffId: 12, week: 0, weekday: 4, slot: null, status: LEAVE_REQUEST_STATUSES.APPROVED },
    { requestId: 2, staffId: 12, week: 1, weekday: 4, slot: null, status: LEAVE_REQUEST_STATUSES.APPROVED },
];

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
