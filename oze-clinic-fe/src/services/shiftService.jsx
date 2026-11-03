import { formatDate, toDateOnly } from "../utils/format";
import { USER_ROLES } from "../utils/messages";
import { MOCK_ROOMS, ROOM_STATUSES, ROOM_TYPES } from "../utils/data/mockRooms";
import {
    MOCK_ABSENCES,
    MOCK_LEAVES,
    MOCK_SHIFT_TASKS,
    MOCK_SHIFT_TEMPLATE,
    MOCK_UNASSIGNED,
    SHIFT_SLOT_OPTIONS,
    SHIFT_STATUSES,
} from "../utils/data/mockShifts";
import { ACCOUNT_STATUSES, MOCK_STAFF } from "../utils/data/mockStaff";

// TODO(api): mock only. Shifts live in memory, so changes last until the page is reloaded.
const MOCK_DELAY_MS = 300;

// Roles that can be put on shift, with the names used on the shift pages.
export const SHIFT_ROLE_OPTIONS = [
    { value: USER_ROLES.DOCTOR, label: "Bác sĩ" },
    { value: USER_ROLES.DENTAL_IMAGING_TECHNICIAN, label: "Kỹ thuật viên" },
    { value: USER_ROLES.RECEPTIONIST, label: "Lễ tân" },
];

// Lower-case name: an upper-case object of member expressions looks like a component to react-refresh.
const rolesByRoomType = {
    [ROOM_TYPES.GENERAL]: USER_ROLES.DOCTOR,
    [ROOM_TYPES.MINOR_SURGERY]: USER_ROLES.DOCTOR,
    [ROOM_TYPES.SPECIALIZED]: USER_ROLES.DOCTOR,
    [ROOM_TYPES.XRAY]: USER_ROLES.DENTAL_IMAGING_TECHNICIAN,
    [ROOM_TYPES.RECEPTION]: USER_ROLES.RECEPTIONIST,
};

// Role that may work in a type of room.
export const roomTypeRole = (roomType) => rolesByRoomType[roomType];

export const WEEKDAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Whether a candidate can take a shift.
export const AVAILABILITY = {
    FREE: "free",
    BUSY: "busy",
    LEAVE: "leave",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (errors, message = null) => ({ success: false, message, data: null, errors });

const pad = (value) => String(value).padStart(2, "0");

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Monday of the week.
const startOfWeek = (date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));

const parseDay = (dateOnly) => {
    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Date(year, month - 1, day);
};

// 0 = Monday ... 6 = Sunday.
const weekdayOf = (dateOnly) => (parseDay(dateOnly).getDay() + 6) % 7;

// "T4 21/10/2026"
export const formatShiftDate = (dateOnly) => `${WEEKDAYS_SHORT[weekdayOf(dateOnly)]} ${formatDate(dateOnly)}`;

// Popup subtitle of a shift: "Phòng khám · Ca sáng · T4 21/10/2026".
export const formatShiftPlace = (cell) => `${cell.room.name} · ${cell.slotLabel} · ${formatShiftDate(cell.date)}`;

const slotOf = (value) => SHIFT_SLOT_OPTIONS.find((slot) => slot.value === value);

const keyOf = (date, slot, roomId) => `${date}|${slot}|${roomId}`;

// Number in [0, 1) that only depends on the text, so mock check-in times stay the same between reloads.
const seeded = (text) => {
    let hash = 2166136261;
    for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return ((hash >>> 0) % 1000) / 1000;
};

// "08:00" moved by some minutes -> "07:52"
const shiftTime = (time, minutes) => {
    const [hours, mins] = time.split(":").map(Number);
    const total = hours * 60 + mins + minutes;
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

const thisMonday = startOfWeek(new Date());
const mockDate = ({ week, weekday }) => toDateOnly(addDays(thisMonday, week * 7 + weekday));

const leaves = MOCK_LEAVES.map((leave) => ({
    ...leave,
    date: mockDate(leave),
    approvedAt: toDateOnly(addDays(parseDay(mockDate(leave)), -leave.approvedDaysBefore)),
}));
const unassignedKeys = new Set(MOCK_UNASSIGNED.map((item) => keyOf(mockDate(item), item.slot, item.roomId)));
const absences = new Map(MOCK_ABSENCES.map((item) => [keyOf(mockDate(item), item.slot, item.roomId), item.reason]));

// Shifts by keyOf(...): { staffId (null = nobody), task, note }. Weeks are filled from the template the first time they are read.
const assignments = new Map();
const seededWeeks = new Set();

const activeRooms = () => MOCK_ROOMS.filter((room) => room.status === ROOM_STATUSES.ACTIVE);

const seedWeek = (monday) => {
    const weekKey = toDateOnly(monday);
    if (seededWeeks.has(weekKey)) return;
    seededWeeks.add(weekKey);
    for (let weekday = 0; weekday < 7; weekday++) {
        const date = toDateOnly(addDays(monday, weekday));
        for (const slot of SHIFT_SLOT_OPTIONS) {
            for (const room of activeRooms()) {
                const key = keyOf(date, slot.value, room.id);
                if (assignments.has(key)) continue;
                const staffId = unassignedKeys.has(key) ? null : (MOCK_SHIFT_TEMPLATE[room.id]?.[slot.value] ?? null);
                assignments.set(key, { staffId, task: staffId ? (MOCK_SHIFT_TASKS[room.id] ?? "") : "", note: "" });
            }
        }
    }
};

const assignmentOf = (date, slot, roomId) => {
    seedWeek(startOfWeek(parseDay(date)));
    return assignments.get(keyOf(date, slot, roomId)) ?? { staffId: null, task: "", note: "" };
};

const staffById = (id) => MOCK_STAFF.find((member) => member.id === id);

const roleLabel = (role) => SHIFT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "";

// Titles such as "BS." are left out of the schedule.
const displayName = (fullName) => fullName.replace(/^(BS|KTV)\.\s*/, "");

const toStaff = (member) => ({
    id: member.id,
    name: displayName(member.fullName),
    role: member.role,
    roleLabel: roleLabel(member.role),
    phone: member.phone,
});

const leaveOf = (staffId, date, slot) =>
    leaves.find((leave) => leave.staffId === staffId && leave.date === date && (leave.slot === null || leave.slot === slot));

// Room the staff member already works in at that time, other than roomId.
const otherRoomOf = (staffId, date, slot, roomId) =>
    activeRooms().find((room) => room.id !== roomId && assignmentOf(date, slot, room.id).staffId === staffId);

const nowMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
};

const toMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

// "past" = over, "running" = started but not over, "future" = not started.
const timingOf = (date, slotValue) => {
    const today = toDateOnly(new Date());
    if (date !== today) return date < today ? "past" : "future";
    const slot = slotOf(slotValue);
    if (nowMinutes() >= toMinutes(slot.end)) return "past";
    return nowMinutes() >= toMinutes(slot.start) ? "running" : "future";
};

const toRoom = (room) => ({ id: room.id, name: room.name, type: room.type, floor: room.floor });

const buildCell = (date, slotValue, room) => {
    const key = keyOf(date, slotValue, room.id);
    const { staffId, task, note } = assignmentOf(date, slotValue, room.id);
    const slot = slotOf(slotValue);
    const cell = { key, date, slot: slotValue, slotLabel: slot.label, start: slot.start, end: slot.end, room: toRoom(room), task, note };
    const member = staffId ? staffById(staffId) : null;
    if (!member) return { ...cell, staff: null, status: SHIFT_STATUSES.UNASSIGNED };

    const staff = toStaff(member);
    const leave = leaveOf(staffId, date, slotValue);
    if (leave) {
        return {
            ...cell,
            staff,
            status: SHIFT_STATUSES.LEAVE,
            leave: { requestId: leave.requestId, approvedAt: leave.approvedAt, wholeDay: leave.slot === null, reason: leave.reason },
        };
    }

    const timing = timingOf(date, slotValue);
    if (timing === "future") return { ...cell, staff, status: SHIFT_STATUSES.PENDING };
    if (absences.has(key) && timing === "past") return { ...cell, staff, status: SHIFT_STATUSES.ABSENT, absenceReason: absences.get(key) };
    return {
        ...cell,
        staff,
        status: SHIFT_STATUSES.PRESENT,
        checkIn: shiftTime(slot.start, -Math.floor(seeded(`${key}-in`) * 10) - 1),
        checkOut: timing === "past" ? shiftTime(slot.end, Math.floor(seeded(`${key}-out`) * 10)) : null,
    };
};

const weekLabel = (from, to) => `${pad(from.getDate())}/${pad(from.getMonth() + 1)} – ${formatDate(toDateOnly(to))}`;

// "19/10 – 25/10/2026" for each week offset, for the week picker.
export const getWeekOptions = (offsets) =>
    offsets.map((offset) => {
        const from = addDays(thisMonday, offset * 7);
        return { value: offset, label: weekLabel(from, addDays(from, 6)) };
    });

// Week of the schedule. weekOffset: 0 = this week, 1 = next week, -1 = last week ...
// editable: the week has not started, so shifts can be assigned and changed.
export const getWeekShifts = async ({ weekOffset = 0 } = {}) => {
    await wait(MOCK_DELAY_MS);

    const today = toDateOnly(new Date());
    const from = addDays(thisMonday, weekOffset * 7);
    const to = addDays(from, 6);
    seedWeek(from);

    const days = Array.from({ length: 7 }, (_, weekday) => {
        const date = toDateOnly(addDays(from, weekday));
        return { date, weekday: WEEKDAYS_SHORT[weekday], label: date.slice(8, 10) + "/" + date.slice(5, 7), isToday: date === today };
    });
    const rooms = activeRooms();
    const cells = days.flatMap((day) => SHIFT_SLOT_OPTIONS.flatMap((slot) => rooms.map((room) => buildCell(day.date, slot.value, room))));
    const upcoming = cells.filter((cell) => cell.date >= today);

    return success({
        weekOffset,
        from: toDateOnly(from),
        to: toDateOnly(to),
        label: weekLabel(from, to),
        editable: toDateOnly(from) > today,
        days,
        slots: SHIFT_SLOT_OPTIONS,
        rooms: rooms.map(toRoom),
        cells,
        summary: {
            unassigned: upcoming.filter((cell) => cell.status === SHIFT_STATUSES.UNASSIGNED).length,
            needReplacement: upcoming.filter((cell) => cell.status === SHIFT_STATUSES.LEAVE).length,
        },
        maintenanceRooms: MOCK_ROOMS.filter((room) => room.status === ROOM_STATUSES.MAINTENANCE).map((room) => room.name),
    });
};

const roomById = (id) => MOCK_ROOMS.find((room) => room.id === id);

const AVAILABILITY_ORDER = [AVAILABILITY.FREE, AVAILABILITY.BUSY, AVAILABILITY.LEAVE];

const activeStaffWithRole = (role) =>
    MOCK_STAFF.filter((member) => member.status === ACCOUNT_STATUSES.ACTIVE && member.role === role);

// Staff whose role fits the room, with whether they can take the shift: free, already in another room (busyRoom), or on leave.
export const getShiftCandidates = async ({ date, slot, roomId }) => {
    await wait(MOCK_DELAY_MS);

    const room = roomById(roomId);
    const candidates = activeStaffWithRole(roomTypeRole(room.type)).map((member) => {
        const otherRoom = otherRoomOf(member.id, date, slot, roomId);
        let availability = AVAILABILITY.FREE;
        if (leaveOf(member.id, date, slot)) availability = AVAILABILITY.LEAVE;
        else if (otherRoom) availability = AVAILABILITY.BUSY;
        return { ...toStaff(member), availability, busyRoom: otherRoom?.name ?? null };
    });
    candidates.sort((a, b) => AVAILABILITY_ORDER.indexOf(a.availability) - AVAILABILITY_ORDER.indexOf(b.availability));
    return success(candidates);
};

// Staff who can be given a monthly schedule.
export const getShiftStaff = async () => {
    await wait(MOCK_DELAY_MS);
    const roles = SHIFT_ROLE_OPTIONS.map((option) => option.value);
    return success(
        MOCK_STAFF.filter((member) => member.status === ACCOUNT_STATUSES.ACTIVE && roles.includes(member.role)).map(toStaff),
    );
};

// Rooms a role can work in, for the monthly schedule.
export const roomsForRole = (role) =>
    activeRooms()
        .filter((room) => roomTypeRole(room.type) === role)
        .map(toRoom);

const isFuture = (date, slot) => timingOf(date, slot) === "future";

// Puts staffId on a shift (or changes it). request: { date, slot, roomId, staffId, task, note }.
export const saveShift = async ({ date, slot, roomId, staffId, task = "", note = "" }) => {
    await wait(MOCK_DELAY_MS);

    if (!isFuture(date, slot)) return failure({ form: "Ca này đã bắt đầu, không thể thay đổi." });
    if (leaveOf(staffId, date, slot)) return failure({ staffId: "Nhân viên này đã được duyệt nghỉ trong ca." });
    const otherRoom = otherRoomOf(staffId, date, slot, roomId);
    if (otherRoom) return failure({ staffId: `Nhân viên này đã có ca ở ${otherRoom.name}.` });

    const current = assignmentOf(date, slot, roomId);
    assignments.set(keyOf(date, slot, roomId), { staffId, task: task.trim(), note: note.trim() });
    return success(buildCell(date, slot, roomById(roomId)), current.staffId ? "Cập nhật phân ca thành công!" : "Phân ca thành công!");
};

export const deleteShift = async ({ date, slot, roomId }) => {
    await wait(MOCK_DELAY_MS);

    if (!isFuture(date, slot)) return failure({ form: "Ca này đã bắt đầu, không thể xoá." });
    assignments.set(keyOf(date, slot, roomId), { staffId: null, task: "", note: "" });
    return success(null, "Đã xoá ca.");
};

// Fills the empty shifts of a week with the people of the same shifts a week earlier (skipping anyone on leave or busy).
export const copyPreviousWeek = async ({ weekOffset }) => {
    await wait(MOCK_DELAY_MS);

    const from = addDays(thisMonday, weekOffset * 7);
    let copied = 0;
    for (let weekday = 0; weekday < 7; weekday++) {
        const date = toDateOnly(addDays(from, weekday));
        const previousDate = toDateOnly(addDays(from, weekday - 7));
        for (const slot of SHIFT_SLOT_OPTIONS) {
            if (!isFuture(date, slot.value)) continue;
            for (const room of activeRooms()) {
                const current = assignmentOf(date, slot.value, room.id);
                const previous = assignmentOf(previousDate, slot.value, room.id);
                if (current.staffId || !previous.staffId) continue;
                if (leaveOf(previous.staffId, date, slot.value) || otherRoomOf(previous.staffId, date, slot.value, room.id)) continue;
                assignments.set(keyOf(date, slot.value, room.id), { ...previous });
                copied++;
            }
        }
    }
    return success({ copied }, copied > 0 ? `Đã sao chép ${copied} ca từ tuần trước.` : "Không có ca trống nào để sao chép.");
};

// Monthly schedule for one person. pattern[weekday][slot] = roomId or "" (not working), weekday 0 = Monday.
// Returns what would be created: { created, skippedLeave: [date], conflicts: [{ date, slot, reason }] }.
// dryRun = true only counts, without saving.
export const createMonthlyShifts = async ({ staffId, from, to, pattern, skipLeave, overwrite, dryRun = false }) => {
    await wait(dryRun ? 150 : MOCK_DELAY_MS);

    const member = staffById(staffId);
    if (!member) return failure({ staffId: "Vui lòng chọn nhân viên." });
    if (!from || !to || from > to) return failure({ to: "Đến ngày phải sau Từ ngày." });

    const result = { created: 0, skippedLeave: [], conflicts: [] };
    for (let day = parseDay(from); toDateOnly(day) <= to; day = addDays(day, 1)) {
        const date = toDateOnly(day);
        for (const slot of SHIFT_SLOT_OPTIONS) {
            const roomId = Number(pattern[weekdayOf(date)]?.[slot.value]) || null;
            if (!roomId || !isFuture(date, slot.value)) continue;
            if (skipLeave && leaveOf(staffId, date, slot.value)) {
                result.skippedLeave.push(date);
                continue;
            }
            const current = assignmentOf(date, slot.value, roomId);
            const otherRoom = otherRoomOf(staffId, date, slot.value, roomId);
            if (otherRoom) {
                result.conflicts.push({ date, slot: slot.value, reason: `đã có ca ở ${otherRoom.name}` });
                continue;
            }
            if (current.staffId && current.staffId !== staffId && !overwrite) {
                const taken = displayName(staffById(current.staffId).fullName);
                result.conflicts.push({ date, slot: slot.value, reason: `${roomById(roomId).name} đã có ${taken}` });
                continue;
            }
            if (!dryRun) assignments.set(keyOf(date, slot.value, roomId), { staffId, task: MOCK_SHIFT_TASKS[roomId] ?? "", note: "" });
            result.created++;
        }
    }
    return success(result, dryRun ? null : `Đã tạo ${result.created} ca cho ${displayName(member.fullName)}.`);
};
