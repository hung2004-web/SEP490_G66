import { ACCOUNT_STATUSES, MOCK_LOCK_IMPACT, MOCK_STAFF } from "../utils/data/mockStaff";
import { USER_ROLES } from "../utils/messages";
import { normalizePhone } from "../utils/validation";

// TODO(api): mock only, swap for the staff account endpoints once the backend has them.
const MOCK_DELAY_MS = 300;

export const STAFF_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message, errors = null) => ({ success: false, message, data: null, errors });

const staff = MOCK_STAFF.map((member) => ({ ...member }));

const normalize = (value) => value.trim().toLowerCase();

// Phone numbers match with or without spaces: "0912 111" finds 0912111222.
const digitsOf = (value) => value.replace(/\D/g, "");

const matches = (member, search) => {
    if (!search) return true;
    if ([member.code, member.fullName, member.email].some((field) => normalize(field).includes(search))) return true;
    // Only a number-like search looks at phones, so "NV0012" does not match phones containing "0012".
    return /^[\d\s.]+$/.test(search) && member.phone.includes(digitsOf(search));
};

const findMember = (id) => staff.find((member) => member.id === id);

const isEmailInUse = (email, exceptId) => staff.some((member) => member.id !== exceptId && normalize(member.email) === normalize(email));

const isPhoneInUse = (phone, exceptId) => staff.some((member) => member.id !== exceptId && member.phone === phone);

// Form values -> stored fields. licenseNumber is kept for doctors only.
const toStaffFields = (request) => ({
    fullName: request.fullName.trim(),
    role: request.role,
    email: request.email.trim(),
    phone: normalizePhone(request.phone),
    birthDate: request.birthDate || null,
    licenseNumber: request.role === USER_ROLES.DOCTOR ? request.licenseNumber.trim() : undefined,
});

const findConflicts = (fields, exceptId) => {
    const errors = {};
    if (isEmailInUse(fields.email, exceptId)) errors.email = "Email đã tồn tại";
    if (isPhoneInUse(fields.phone, exceptId)) errors.phone = "Số điện thoại đã tồn tại";
    return errors;
};

// Search by code, name, email or phone; filter by role and status.
export const getStaffAccounts = async ({ keyword = "", role = "", status = "", page = 1, pageSize = STAFF_PAGE_SIZE } = {}) => {
    await wait(MOCK_DELAY_MS);

    const search = normalize(keyword);
    const filtered = staff.filter(
        (member) => matches(member, search) && (!role || member.role === role) && (!status || member.status === status),
    );

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((member) => ({ ...member }));

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

// The temporary password goes to the staff member by SMS (done by the backend).
export const createStaffAccount = async (request) => {
    await wait(MOCK_DELAY_MS);

    const fields = toStaffFields(request);
    const errors = findConflicts(fields);
    if (Object.keys(errors).length > 0) return failure(null, errors);

    const id = Math.max(0, ...staff.map((member) => member.id)) + 3;
    const member = { id, code: `NV${String(id).padStart(4, "0")}`, ...fields, status: ACCOUNT_STATUSES.ACTIVE };
    // New accounts go to the top of the list.
    staff.unshift(member);
    return success({ ...member }, `Đã tạo tài khoản ${member.code}. Mật khẩu tạm đã được gửi qua SMS.`);
};

export const updateStaffAccount = async (id, request) => {
    await wait(MOCK_DELAY_MS);

    const member = findMember(id);
    if (!member) return failure("Tài khoản không còn tồn tại.");

    const fields = toStaffFields(request);
    const errors = findConflicts(fields, id);
    if (Object.keys(errors).length > 0) return failure(null, errors);

    Object.assign(member, fields);
    return success({ ...member }, `Đã cập nhật tài khoản ${member.code}.`);
};

// Upcoming shifts to reassign and, for doctors, upcoming appointments to move to another doctor.
export const getLockImpact = async (id) => {
    await wait(MOCK_DELAY_MS);

    const member = findMember(id);
    if (!member) return failure("Tài khoản không còn tồn tại.");

    const isDoctor = member.role === USER_ROLES.DOCTOR;
    const impact = MOCK_LOCK_IMPACT[id] ?? { upcomingShifts: id % 5, upcomingAppointments: (id * 7) % 11 };
    return success({ upcomingShifts: impact.upcomingShifts, upcomingAppointments: isDoctor ? impact.upcomingAppointments : 0 });
};

export const lockStaffAccount = async (id, { reason, note }) => {
    await wait(MOCK_DELAY_MS);

    const member = findMember(id);
    if (!member) return failure("Tài khoản không còn tồn tại.");
    if (member.status === ACCOUNT_STATUSES.LOCKED) return failure("Tài khoản đã bị khoá trước đó.");

    member.status = ACCOUNT_STATUSES.LOCKED;
    member.lock = { reason, note: note.trim() };
    return success(null, `Đã khoá tài khoản ${member.code}.`);
};

export const unlockStaffAccount = async (id) => {
    await wait(MOCK_DELAY_MS);

    const member = findMember(id);
    if (!member) return failure("Tài khoản không còn tồn tại.");

    member.status = ACCOUNT_STATUSES.ACTIVE;
    member.lock = null;
    return success(null, `Đã mở khoá tài khoản ${member.code}.`);
};
