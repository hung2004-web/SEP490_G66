import { MOCK_AUDIT_LOGS } from "../utils/data/mockAuditLogs";
import { normalizeText, toClinicDateTime } from "../utils/format";

// TODO(api): mock only, swap for the audit log endpoints once the backend has them.
const MOCK_DELAY_MS = 300;

export const AUDIT_LOG_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

// Search by user name or IP; from and to are "YYYY-MM-DD" days in clinic time, both included.
const filterLogs = ({ keyword = "", from = "", to = "", action = "", entityType = "" }) => {
    const search = normalizeText(keyword);
    const start = toClinicDateTime(from, "00:00:00");
    const end = toClinicDateTime(to, "23:59:59.999");

    return MOCK_AUDIT_LOGS.filter((log) => {
        const createdAt = new Date(log.createdAt);
        return (
            (!search || normalizeText(log.userName).includes(search) || log.ipAddress.includes(search)) &&
            (!start || createdAt >= start) &&
            (!end || createdAt <= end) &&
            (!action || log.action === action) &&
            (!entityType || log.entityType === entityType)
        );
    });
};

export const getAuditLogs = async ({ page = 1, pageSize = AUDIT_LOG_PAGE_SIZE, ...filters } = {}) => {
    await wait(MOCK_DELAY_MS);

    const filtered = filterLogs(filters);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

// Every log matching the filters, for the Excel export.
export const getAllAuditLogs = async (filters = {}) => {
    await wait(MOCK_DELAY_MS);
    return success(filterLogs(filters));
};
