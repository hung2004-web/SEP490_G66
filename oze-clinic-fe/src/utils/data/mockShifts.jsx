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

// Default "Nhiệm vụ" of a shift per room.
export const MOCK_SHIFT_TASKS = {
    1: "Khám tổng quát & vãng lai",
    2: "Nhổ răng khôn theo lịch hẹn",
    3: "Niềng răng, lấy dấu",
    4: "Chụp X-quang theo chỉ định",
    6: "Đón tiếp, thu ngân",
};

// The entries below are placed relative to today: week 0 = this week, 1 = next week; weekday 0 = Monday ... 6 = Sunday.

// Approved leave. slot null = the whole day.
export const MOCK_LEAVES = [
    { requestId: 1, staffId: 12, week: 0, weekday: 4, slot: null, approvedDaysBefore: 7, reason: "Việc gia đình" },
    { requestId: 2, staffId: 12, week: 1, weekday: 4, slot: null, approvedDaysBefore: 5, reason: "Việc gia đình" },
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
