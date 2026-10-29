import { ACCOUNT_STATUSES, MOCK_STAFF } from "../utils/data/mockStaff";

// TODO(api): mock only, swap for the staff account endpoints once the backend has them.
const MOCK_DELAY_MS = 300;

export const STAFF_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

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

export const lockStaffAccount = async (id, { reason }) => {
    await wait(MOCK_DELAY_MS);

    const member = findMember(id);
    if (!member) return failure("Tài khoản không còn tồn tại.");
    if (member.status === ACCOUNT_STATUSES.LOCKED) return failure("Tài khoản đã bị khoá trước đó.");

    member.status = ACCOUNT_STATUSES.LOCKED;
    member.lockReason = reason.trim();
    return success(null, `Đã khoá tài khoản ${member.code}.`);
};

export const unlockStaffAccount = async (id) => {
    await wait(MOCK_DELAY_MS);

    const member = findMember(id);
    if (!member) return failure("Tài khoản không còn tồn tại.");

    member.status = ACCOUNT_STATUSES.ACTIVE;
    member.lockReason = null;
    return success(null, `Đã mở khoá tài khoản ${member.code}.`);
};
