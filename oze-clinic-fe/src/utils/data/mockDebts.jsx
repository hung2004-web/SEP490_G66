import { getClinicToday, parseDateOnly, toDateOnly } from "@/utils/format";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEBT_STATUSES = {
    PARTIALLY_PAID: "partially_paid",
    PENDING: "pending",
    UNPAID: "unpaid",
};

export const DEBT_STATUS_LABELS = {
    [DEBT_STATUSES.PARTIALLY_PAID]: { label: "Thanh toán một phần", badge: "badge-warning" },
    [DEBT_STATUSES.PENDING]: { label: "Chờ xác nhận", badge: "badge-warning" },
    [DEBT_STATUSES.UNPAID]: { label: "Chưa thanh toán", badge: "badge-danger" },
};

export const DEBT_PAYMENT_STATUSES = {
    CONFIRMED: "confirmed",
    PENDING: "pending",
    FAILED: "failed",
};

export const DEBT_PAYMENT_STATUS_LABELS = {
    [DEBT_PAYMENT_STATUSES.CONFIRMED]: { label: "Đã xác nhận", badge: "badge-success" },
    [DEBT_PAYMENT_STATUSES.PENDING]: { label: "Chờ xác nhận", badge: "badge-warning" },
    [DEBT_PAYMENT_STATUSES.FAILED]: { label: "Thất bại", badge: "badge-danger" },
};

// How a debt is coloured once it is older than `days`. Oldest level first, which is the order getDebtAgeLevel checks.
export const DEBT_AGE_LEVELS = [
    {
        days: 60,
        row: "bg-danger-soft hover:bg-danger-soft",
        edge: "border-l-3 border-l-danger-solid",
        date: "font-semibold text-danger",
        swatch: "border-danger-solid bg-danger-soft",
    },
    {
        days: 30,
        row: "bg-warning-soft hover:bg-warning-soft",
        edge: "border-l-3 border-l-warning-solid",
        date: "font-semibold text-warning",
        swatch: "border-warning-solid bg-warning-soft",
    },
];

export const getDebtAgeInDays = (createdAt) => {
    const created = parseDateOnly(createdAt);
    return created ? Math.round((parseDateOnly(getClinicToday()) - created) / MS_PER_DAY) : null;
};

// The level of a debt created on createdAt, or null while it is 30 days old or less.
export const getDebtAgeLevel = (createdAt) => {
    const ageInDays = getDebtAgeInDays(createdAt);
    return DEBT_AGE_LEVELS.find((level) => ageInDays > level.days) ?? null;
};

export const DEBT_AGE_FILTERS = {
    WITHIN_30: "within_30",
    OVER_30: "over_30",
    OVER_60: "over_60",
};

export const DEBT_AGE_FILTER_LABELS = {
    [DEBT_AGE_FILTERS.WITHIN_30]: "Trong 30 ngày",
    [DEBT_AGE_FILTERS.OVER_30]: "Quá 30 ngày",
    [DEBT_AGE_FILTERS.OVER_60]: "Quá 60 ngày",
};

export const DEBT_SOURCES = {
    TREATMENT_PLAN: "treatment_plan",
    VISIT: "visit",
};

export const DEBT_SOURCE_LABELS = {
    [DEBT_SOURCES.TREATMENT_PLAN]: "Kế hoạch điều trị",
    [DEBT_SOURCES.VISIT]: "Khám lẻ",
};

// OLDEST is "" because it is the default choice of the sort dropdown.
export const DEBT_SORTS = {
    OLDEST: "",
    NEWEST: "newest",
    LARGEST: "largest",
};

export const DEBT_SORT_LABELS = {
    [DEBT_SORTS.OLDEST]: "Nợ lâu nhất",
    [DEBT_SORTS.NEWEST]: "Nợ mới nhất",
    [DEBT_SORTS.LARGEST]: "Còn nợ nhiều nhất",
};

const daysAgo = (days) => {
    const date = parseDateOnly(getClinicToday());
    date.setDate(date.getDate() - days);
    return toDateOnly(date);
};

const service = (name, unitPrice, quantity = 1) => ({ name, unitPrice, quantity });

const payment = (daysBefore, amount, method, status, confirmedById = null) => ({ paidAt: daysAgo(daysBefore), amount, method, status, confirmedById });

const { TREATMENT_PLAN, VISIT } = DEBT_SOURCES;
const { CONFIRMED, PENDING, FAILED } = DEBT_PAYMENT_STATUSES;

// Dates count back from today, so the row colours keep showing every level. doctorId and confirmedById: ids in MOCK_STAFF.
// The amounts and the status are worked out from services and payments in debtService.
export const MOCK_DEBT_INVOICES = [
    { id: 1, invoiceNumber: "HD000176", patientName: "Đỗ Mai Khanh", phone: "0977404219", createdAt: daysAgo(68), source: VISIT, treatmentPlanName: null, doctorId: 12, nextVisitDate: daysAgo(-5), services: [service("Trám răng thẩm mỹ", 500000, 3)], payments: [payment(68, 500000, "CASH", CONFIRMED, 24)] },
    { id: 2, invoiceNumber: "HD000188", patientName: "Vũ Đức Long", phone: "0903112448", createdAt: daysAgo(47), source: TREATMENT_PLAN, treatmentPlanName: "Niềng răng mắc cài kim loại", doctorId: 12, nextVisitDate: daysAgo(-7), services: [service("Giai đoạn 1 · Gắn mắc cài kim loại", 20000000), service("Giai đoạn 2 · Siết dây định kỳ (6 tháng)", 18000000), service("Giai đoạn 3 · Tháo mắc cài & duy trì", 7000000)], payments: [payment(47, 15000000, "CASH", CONFIRMED, 24), payment(17, 12000000, "BANK_TRANSFER", CONFIRMED, 24), payment(5, 10000000, "BANK_TRANSFER", FAILED), payment(4, 10000000, "BANK_TRANSFER", CONFIRMED, 36)] },
    { id: 3, invoiceNumber: "HD000192", patientName: "Lê Hoàng Yến", phone: "0918330125", createdAt: daysAgo(34), source: TREATMENT_PLAN, treatmentPlanName: "Cấy ghép Implant 46", doctorId: 15, nextVisitDate: daysAgo(-12), services: [service("Trụ Implant", 16000000), service("Mão sứ trên Implant", 8000000)], payments: [payment(34, 12000000, "BANK_TRANSFER", CONFIRMED, 36)] },
    { id: 4, invoiceNumber: "HD000201", patientName: "Trịnh Văn Khải", phone: "0935781006", createdAt: daysAgo(21), source: TREATMENT_PLAN, treatmentPlanName: "Bọc răng sứ 26", doctorId: 30, nextVisitDate: null, services: [service("Mão sứ toàn sứ", 6000000), service("Điều trị tủy trước bọc", 500000)], payments: [payment(21, 4500000, "QR_TRANSFER", CONFIRMED, 45)] },
    { id: 5, invoiceNumber: "HD000187", patientName: "Phạm Minh Tuấn", phone: "0909245631", createdAt: daysAgo(3), source: VISIT, treatmentPlanName: null, doctorId: 15, nextVisitDate: null, services: [service("Nhổ răng khôn", 1500000)], payments: [payment(3, 1500000, "QR_TRANSFER", PENDING)] },
    { id: 6, invoiceNumber: "HD000190", patientName: "Hoàng Văn Bình", phone: "0326778412", createdAt: daysAgo(3), source: VISIT, treatmentPlanName: null, doctorId: 39, nextVisitDate: null, services: [service("Khám tổng quát", 150000)], payments: [] },
    { id: 7, invoiceNumber: "HD000198", patientName: "Bùi Văn Hưng", phone: "0962118304", createdAt: daysAgo(1), source: VISIT, treatmentPlanName: null, doctorId: 12, nextVisitDate: null, services: [service("Lấy cao răng", 300000), service("Trám răng", 300000)], payments: [] },
    { id: 8, invoiceNumber: "HD000203", patientName: "Nguyễn Thị Hoa", phone: "0388552190", createdAt: daysAgo(1), source: VISIT, treatmentPlanName: null, doctorId: 15, nextVisitDate: null, services: [service("Lấy cao răng", 350000)], payments: [] },
    { id: 9, invoiceNumber: "HD000204", patientName: "Phan Quốc Bình", phone: "0971223344", createdAt: daysAgo(1), source: VISIT, treatmentPlanName: null, doctorId: 39, nextVisitDate: null, services: [service("Chụp X-quang toàn cảnh", 250000)], payments: [] },
    { id: 10, invoiceNumber: "HD000205", patientName: "Trần Thị Hoa", phone: "0912556677", createdAt: daysAgo(1), source: TREATMENT_PLAN, treatmentPlanName: "Điều trị tủy răng 36", doctorId: 30, nextVisitDate: daysAgo(-6), services: [service("Điều trị tủy", 1800000)], payments: [payment(1, 800000, "CASH", CONFIRMED, 24)] },
    { id: 11, invoiceNumber: "HD000206", patientName: "Lê Văn Nam", phone: "0987334455", createdAt: daysAgo(1), source: VISIT, treatmentPlanName: null, doctorId: 15, nextVisitDate: null, services: [service("Trám răng", 400000)], payments: [] },
    { id: 12, invoiceNumber: "HD000207", patientName: "Hoàng Thu Thảo", phone: "0934667788", createdAt: daysAgo(1), source: VISIT, treatmentPlanName: null, doctorId: 12, nextVisitDate: null, services: [service("Tẩy trắng răng", 2500000)], payments: [payment(1, 2500000, "BANK_TRANSFER", PENDING)] },
    { id: 13, invoiceNumber: "HD000208", patientName: "Đặng Thanh Tùng", phone: "0905889900", createdAt: daysAgo(0), source: TREATMENT_PLAN, treatmentPlanName: "Niềng răng trong suốt", doctorId: 12, nextVisitDate: daysAgo(-14), services: [service("Khay niềng đợt 1", 30000000)], payments: [payment(0, 10000000, "BANK_TRANSFER", CONFIRMED, 36)] },
    { id: 14, invoiceNumber: "HD000209", patientName: "Ngô Thị Lan Anh", phone: "0978112233", createdAt: daysAgo(0), source: VISIT, treatmentPlanName: null, doctorId: 30, nextVisitDate: null, services: [service("Khám tổng quát", 150000), service("Chụp X-quang quanh chóp", 100000, 2)], payments: [] },
    { id: 15, invoiceNumber: "HD000210", patientName: "Mai Xuân Trường", phone: "0916445566", createdAt: daysAgo(0), source: VISIT, treatmentPlanName: null, doctorId: 39, nextVisitDate: null, services: [service("Nhổ răng sữa", 200000)], payments: [] },
    { id: 16, invoiceNumber: "HD000211", patientName: "Vương Hải Yến", phone: "0983778899", createdAt: daysAgo(0), source: TREATMENT_PLAN, treatmentPlanName: "Bọc răng sứ 11, 21", doctorId: 15, nextVisitDate: daysAgo(-10), services: [service("Mão sứ toàn sứ", 6000000, 2)], payments: [payment(0, 5000000, "QR_TRANSFER", CONFIRMED, 45)] },
    { id: 17, invoiceNumber: "HD000212", patientName: "Tạ Minh Quân", phone: "0928990011", createdAt: daysAgo(0), source: VISIT, treatmentPlanName: null, doctorId: 12, nextVisitDate: null, services: [service("Lấy cao răng", 300000)], payments: [payment(0, 300000, "BANK_TRANSFER", FAILED)] },
    { id: 18, invoiceNumber: "HD000213", patientName: "Cao Thị Mỹ Duyên", phone: "0967223344", createdAt: daysAgo(0), source: VISIT, treatmentPlanName: null, doctorId: 30, nextVisitDate: null, services: [service("Trám răng", 450000)], payments: [] },
];
