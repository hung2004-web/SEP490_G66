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

// TODO(spec): lock reasons are not in the SRS yet.
export const LOCK_REASON_OPTIONS = [
    { value: "resigned", label: "Nghỉ việc" },
    { value: "long_leave", label: "Tạm nghỉ dài hạn" },
    { value: "violation", label: "Vi phạm quy định" },
    { value: "other", label: "Khác" },
];

const { CLINIC_MANAGER, DOCTOR, DENTAL_IMAGING_TECHNICIAN, RECEPTIONIST } = USER_ROLES;
const { ACTIVE, LOCKED } = ACCOUNT_STATUSES;

// phone: digits only; birthDate: YYYY-MM-DD or null; licenseNumber: doctors only (số chứng chỉ hành nghề).
// lock: { reason, note } while the account is locked.
export const MOCK_STAFF = [
    { id: 3, code: "NV0003", fullName: "Trần Thị Lan", email: "lan.tt@oze.vn", role: CLINIC_MANAGER, phone: "0918777888", birthDate: "1985-04-12", status: ACTIVE },
    { id: 12, code: "NV0012", fullName: "BS. Trần Minh Khoa", email: "khoa.tm@oze.vn", role: DOCTOR, phone: "0912111222", birthDate: "1988-09-03", licenseNumber: "001234/HNO-CCHN", status: ACTIVE },
    { id: 15, code: "NV0015", fullName: "BS. Lê Thu Hà", email: "ha.lt@oze.vn", role: DOCTOR, phone: "0913222333", birthDate: "1990-02-21", licenseNumber: "002345/HNO-CCHN", status: ACTIVE },
    { id: 18, code: "NV0018", fullName: "BS. Ngô Văn Đức", email: "duc.nv@oze.vn", role: DOCTOR, phone: "0914333444", birthDate: null, licenseNumber: "003456/HNO-CCHN", status: ACTIVE },
    { id: 21, code: "NV0021", fullName: "KTV. Phạm Quốc Bảo", email: "bao.pq@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0915444555", birthDate: "1994-07-30", status: ACTIVE },
    { id: 24, code: "NV0024", fullName: "Lê Thị Mai", email: "mai.lt@oze.vn", role: RECEPTIONIST, phone: "0916555666", birthDate: "1998-11-08", status: ACTIVE },
    { id: 27, code: "NV0027", fullName: "Đinh Văn Toàn", email: "toan.dv@oze.vn", role: RECEPTIONIST, phone: "0917666777", birthDate: "1997-05-16", status: LOCKED, lock: { reason: "resigned", note: "Nghỉ việc từ 01/10/2026." } },
    { id: 30, code: "NV0030", fullName: "BS. Phan Ngọc Ánh", email: "anh.pn@oze.vn", role: DOCTOR, phone: "0919888999", birthDate: "1992-12-01", licenseNumber: "004567/HNO-CCHN", status: ACTIVE },
    { id: 33, code: "NV0033", fullName: "KTV. Hồ Minh Quân", email: "quan.hm@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0920111333", birthDate: null, status: ACTIVE },
    { id: 36, code: "NV0036", fullName: "Võ Thị Hằng", email: "hang.vt@oze.vn", role: RECEPTIONIST, phone: "0921222444", birthDate: "2000-03-25", status: ACTIVE },
    { id: 39, code: "NV0039", fullName: "BS. Đặng Quốc Huy", email: "huy.dq@oze.vn", role: DOCTOR, phone: "0922333555", birthDate: "1986-08-14", licenseNumber: "005678/HNO-CCHN", status: ACTIVE },
    { id: 42, code: "NV0042", fullName: "BS. Nguyễn Thanh Tâm", email: "tam.nt@oze.vn", role: DOCTOR, phone: "0923444666", birthDate: "1991-01-19", licenseNumber: "006789/HNO-CCHN", status: ACTIVE },
    { id: 45, code: "NV0045", fullName: "Bùi Thị Ngọc", email: "ngoc.bt@oze.vn", role: RECEPTIONIST, phone: "0924555777", birthDate: null, status: ACTIVE },
    { id: 48, code: "NV0048", fullName: "KTV. Trịnh Văn Long", email: "long.tv@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0925666888", birthDate: "1993-06-09", status: LOCKED, lock: { reason: "long_leave", note: "Tạm nghỉ không lương đến hết 12/2026." } },
    { id: 51, code: "NV0051", fullName: "BS. Lý Hoàng Nam", email: "nam.lh@oze.vn", role: DOCTOR, phone: "0926777999", birthDate: "1989-10-27", licenseNumber: "007890/HNO-CCHN", status: ACTIVE },
    { id: 54, code: "NV0054", fullName: "Phạm Thu Trang", email: "trang.pt@oze.vn", role: RECEPTIONIST, phone: "0927888111", birthDate: "1999-09-12", status: ACTIVE },
    { id: 57, code: "NV0057", fullName: "BS. Vũ Hải Yến", email: "yen.vh@oze.vn", role: DOCTOR, phone: "0928999222", birthDate: "1993-04-04", licenseNumber: "008901/HNO-CCHN", status: ACTIVE },
    { id: 60, code: "NV0060", fullName: "Hoàng Minh Tuấn", email: "tuan.hm@oze.vn", role: CLINIC_MANAGER, phone: "0929111444", birthDate: "1984-02-28", status: ACTIVE },
    { id: 63, code: "NV0063", fullName: "KTV. Mai Đức Thịnh", email: "thinh.md@oze.vn", role: DENTAL_IMAGING_TECHNICIAN, phone: "0931222555", birthDate: null, status: ACTIVE },
    { id: 66, code: "NV0066", fullName: "BS. Cao Thị Hương", email: "huong.ct@oze.vn", role: DOCTOR, phone: "0932333666", birthDate: "1995-07-07", licenseNumber: "009012/HNO-CCHN", status: ACTIVE },
    { id: 69, code: "NV0069", fullName: "Đỗ Thị Thảo", email: "thao.dt@oze.vn", role: RECEPTIONIST, phone: "0933444777", birthDate: "2001-12-15", status: LOCKED, lock: { reason: "resigned", note: "Nghỉ việc từ 15/08/2026." } },
    { id: 72, code: "NV0072", fullName: "BS. Tạ Quang Vinh", email: "vinh.tq@oze.vn", role: DOCTOR, phone: "0934555888", birthDate: "1990-05-30", licenseNumber: "010123/HNO-CCHN", status: ACTIVE },
    { id: 75, code: "NV0075", fullName: "Lương Thị Kim", email: "kim.lt@oze.vn", role: RECEPTIONIST, phone: "0935666999", birthDate: null, status: ACTIVE },
];

// What locking an account touches: upcoming shifts to reassign and, for doctors, appointments to move.
// NV0012 matches the mockup; the others are made up from the id.
export const MOCK_LOCK_IMPACT = {
    12: { upcomingShifts: 4, upcomingAppointments: 9 },
};
