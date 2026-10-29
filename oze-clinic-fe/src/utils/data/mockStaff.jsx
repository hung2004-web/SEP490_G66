import { USER_ROLES } from "../messages";

// Mock staff accounts for the clinic manager's "Tài khoản & nhân sự" page.
// TODO(api): the backend has no staff account endpoints yet.

export const ACCOUNT_STATUSES = {
    ACTIVE: "active",
    LOCKED: "locked",
};

// Short role names used in the staff table (ROLE_LABELS in messages has the long ones).
export const STAFF_ROLE_OPTIONS = [
    { value: USER_ROLES.CLINIC_MANAGER, label: "Quản lý" },
    { value: USER_ROLES.DOCTOR, label: "Bác sĩ" },
    { value: USER_ROLES.DENTAL_IMAGING_TECHNICIAN, label: "KTV hình ảnh" },
    { value: USER_ROLES.RECEPTIONIST, label: "Lễ tân" },
];

export const ACCOUNT_STATUS_OPTIONS = [
    { value: ACCOUNT_STATUSES.ACTIVE, label: "Hoạt động" },
    { value: ACCOUNT_STATUSES.LOCKED, label: "Đã khoá" },
];

// For StatusBadge.
export const ACCOUNT_STATUS_LABELS = {
    [ACCOUNT_STATUSES.ACTIVE]: { label: "Hoạt động", badge: "badge-success" },
    [ACCOUNT_STATUSES.LOCKED]: { label: "Đã khoá", badge: "badge-danger" },
};

const { CLINIC_MANAGER, DOCTOR, DENTAL_IMAGING_TECHNICIAN, RECEPTIONIST } = USER_ROLES;
const { ACTIVE, LOCKED } = ACCOUNT_STATUSES;

// phone: digits only; startDate: YYYY-MM-DD.
export const MOCK_STAFF = [
    { id: 3, code: "NV0003", fullName: "Trần Thị Lan", email: "lan.tt@oze.vn", role: CLINIC_MANAGER, phone: "0918777888", startDate: "2021-01-01", status: ACTIVE },
    { id: 12, code: "NV0012", fullName: "BS. Trần Minh Khoa", email: "khoa.tm@oze.vn", role: DOCTOR, phone: "0912111222", startDate: "2022-03-01", status: ACTIVE },
    { id: 15, code: "NV0015", fullName: "BS. Lê Thu Hà", email: "ha.lt@oze.vn", role: DOCTOR, phone: "0913222333", startDate: "2022-06-15", status: ACTIVE },
    { id: 18, code: "NV0018", fullName: "BS. Ngô Văn Đức", email: "duc.nv@oze.vn", role: DOCTOR, phone: "0914333444", startDate: "2023-01-02", status: ACTIVE },
    { id: 21, code: "NV0021", fullName: "KTV. Phạm Quốc Bảo", email: "bao.pq@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0915444555", startDate: "2023-04-10", status: ACTIVE },
    { id: 24, code: "NV0024", fullName: "Lê Thị Mai", email: "mai.lt@oze.vn", role: RECEPTIONIST, phone: "0916555666", startDate: "2023-08-01", status: ACTIVE },
    { id: 27, code: "NV0027", fullName: "Đinh Văn Toàn", email: "toan.dv@oze.vn", role: RECEPTIONIST, phone: "0917666777", startDate: "2024-02-05", status: LOCKED, lockReason: "Đã nghỉ việc từ 01/10/2026." },
    { id: 30, code: "NV0030", fullName: "BS. Phan Ngọc Ánh", email: "anh.pn@oze.vn", role: DOCTOR, phone: "0919888999", startDate: "2024-03-03", status: ACTIVE },
    { id: 33, code: "NV0033", fullName: "KTV. Hồ Minh Quân", email: "quan.hm@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0920111333", startDate: "2024-06-12", status: ACTIVE },
    { id: 36, code: "NV0036", fullName: "Võ Thị Hằng", email: "hang.vt@oze.vn", role: RECEPTIONIST, phone: "0921222444", startDate: "2026-10-19", status: ACTIVE },
    { id: 39, code: "NV0039", fullName: "BS. Đặng Quốc Huy", email: "huy.dq@oze.vn", role: DOCTOR, phone: "0922333555", startDate: "2024-08-20", status: ACTIVE },
    { id: 42, code: "NV0042", fullName: "BS. Nguyễn Thanh Tâm", email: "tam.nt@oze.vn", role: DOCTOR, phone: "0923444666", startDate: "2024-09-02", status: ACTIVE },
    { id: 45, code: "NV0045", fullName: "Bùi Thị Ngọc", email: "ngoc.bt@oze.vn", role: RECEPTIONIST, phone: "0924555777", startDate: "2024-11-11", status: ACTIVE },
    { id: 48, code: "NV0048", fullName: "KTV. Trịnh Văn Long", email: "long.tv@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0925666888", startDate: "2025-01-06", status: LOCKED, lockReason: "Tạm nghỉ không lương đến hết 12/2026." },
    { id: 51, code: "NV0051", fullName: "BS. Lý Hoàng Nam", email: "nam.lh@oze.vn", role: DOCTOR, phone: "0926777999", startDate: "2025-02-17", status: ACTIVE },
    { id: 54, code: "NV0054", fullName: "Phạm Thu Trang", email: "trang.pt@oze.vn", role: RECEPTIONIST, phone: "0927888111", startDate: "2025-03-24", status: ACTIVE },
    { id: 57, code: "NV0057", fullName: "BS. Vũ Hải Yến", email: "yen.vh@oze.vn", role: DOCTOR, phone: "0928999222", startDate: "2025-05-05", status: ACTIVE },
    { id: 60, code: "NV0060", fullName: "Hoàng Minh Tuấn", email: "tuan.hm@oze.vn", role: CLINIC_MANAGER, phone: "0929111444", startDate: "2025-06-01", status: ACTIVE },
    { id: 63, code: "NV0063", fullName: "KTV. Mai Đức Thịnh", email: "thinh.md@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0931222555", startDate: "2025-08-18", status: ACTIVE },
    { id: 66, code: "NV0066", fullName: "BS. Cao Thị Hương", email: "huong.ct@oze.vn", role: DOCTOR, phone: "0932333666", startDate: "2025-10-01", status: ACTIVE },
    { id: 69, code: "NV0069", fullName: "Đỗ Thị Thảo", email: "thao.dt@oze.vn", role: RECEPTIONIST, phone: "0933444777", startDate: "2026-01-12", status: LOCKED, lockReason: "Đã nghỉ việc từ 15/08/2026." },
    { id: 72, code: "NV0072", fullName: "BS. Tạ Quang Vinh", email: "vinh.tq@oze.vn", role: DOCTOR, phone: "0934555888", startDate: "2026-04-06", status: ACTIVE },
    { id: 75, code: "NV0075", fullName: "Lương Thị Kim", email: "kim.lt@oze.vn", role: RECEPTIONIST, phone: "0935666999", startDate: "2026-07-20", status: ACTIVE },
];
