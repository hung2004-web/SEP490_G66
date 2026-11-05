import { DEBT_AGE_FILTERS, DEBT_PAYMENT_STATUSES, DEBT_SORTS, DEBT_STATUSES, MOCK_DEBT_INVOICES, getDebtAgeInDays } from "../utils/data/mockDebts";
import { MOCK_STAFF } from "../utils/data/mockStaff";
import { normalizeText } from "../utils/format";
import { PAYMENT_METHOD_LABELS } from "../utils/messages";

// TODO(api): mock only, swap for the debt endpoints once the backend has them.
const MOCK_DELAY_MS = 300;

export const DEBT_PAGE_SIZE = 8;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const staffName = (id) => MOCK_STAFF.find((member) => member.id === id)?.fullName ?? null;

const debtStatus = (paidAmount, payments) => {
    if (paidAmount > 0) return DEBT_STATUSES.PARTIALLY_PAID;
    return payments.some((payment) => payment.status === DEBT_PAYMENT_STATUSES.PENDING) ? DEBT_STATUSES.PENDING : DEBT_STATUSES.UNPAID;
};

// Only confirmed payments count as paid: a failed or waiting one leaves the debt as it was.
const toDebt = (invoice) => {
    const services = invoice.services.map((service, index) => ({ ...service, id: index + 1, amount: service.unitPrice * service.quantity }));
    const payments = invoice.payments.map((payment, index) => ({
        ...payment,
        id: index + 1,
        methodLabel: PAYMENT_METHOD_LABELS[payment.method],
        confirmedByName: staffName(payment.confirmedById),
    }));
    const totalAmount = services.reduce((sum, service) => sum + service.amount, 0);
    const paidAmount = payments.filter((payment) => payment.status === DEBT_PAYMENT_STATUSES.CONFIRMED).reduce((sum, payment) => sum + payment.amount, 0);

    return {
        ...invoice,
        services,
        payments,
        doctorName: staffName(invoice.doctorId),
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        status: debtStatus(paidAmount, payments),
    };
};

const debts = MOCK_DEBT_INVOICES.map(toDebt).filter((debt) => debt.remainingAmount > 0);

const AGE_MATCHERS = {
    [DEBT_AGE_FILTERS.WITHIN_30]: (days) => days <= 30,
    [DEBT_AGE_FILTERS.OVER_30]: (days) => days > 30,
    [DEBT_AGE_FILTERS.OVER_60]: (days) => days > 60,
};

// Search by the patient's name or phone, or the invoice number. The phone ignores spaces, since the table shows "0977 404 219".
const matches = (debt, { keyword = "", status = "", age = "", source = "" }) => {
    const search = normalizeText(keyword);
    return (
        (!search ||
            normalizeText(debt.patientName).includes(search) ||
            debt.phone.includes(search.replace(/\s/g, "")) ||
            normalizeText(debt.invoiceNumber).includes(search)) &&
        (!status || debt.status === status) &&
        (!age || AGE_MATCHERS[age](getDebtAgeInDays(debt.createdAt))) &&
        (!source || debt.source === source)
    );
};

const oldestFirst = (a, b) => a.createdAt.localeCompare(b.createdAt) || a.invoiceNumber.localeCompare(b.invoiceNumber);

const COMPARATORS = {
    [DEBT_SORTS.OLDEST]: oldestFirst,
    [DEBT_SORTS.NEWEST]: (a, b) => oldestFirst(b, a),
    [DEBT_SORTS.LARGEST]: (a, b) => b.remainingAmount - a.remainingAmount || oldestFirst(a, b),
};

const filterDebts = ({ sort = DEBT_SORTS.OLDEST, ...filters }) => debts.filter((debt) => matches(debt, filters)).sort(COMPARATORS[sort]);

export const getDebts = async ({ page = 1, pageSize = DEBT_PAGE_SIZE, ...filters } = {}) => {
    await wait(MOCK_DELAY_MS);

    const filtered = filterDebts(filters);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return success({ items, page: currentPage, pageSize, totalItems, totalPages, updatedAt: new Date().toISOString() });
};

// Every debt that matches the filters, for "Xuất danh sách".
export const getAllDebts = async (filters = {}) => {
    await wait(MOCK_DELAY_MS);
    return success(filterDebts(filters));
};

export const getDebt = async (id) => {
    await wait(MOCK_DELAY_MS);

    const debt = debts.find((item) => item.id === id);
    return debt ? success(debt) : failure("Không tìm thấy hoá đơn công nợ.");
};
