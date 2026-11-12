import api from "./api";
import { call } from "./receptionService";

// Receptionist cash drawer hand-over (api/cash-sessions). Every call returns { success, message, data, errors }.

export const EXPENSE_CATEGORIES = [
    { value: "Supplies", label: "Vật tư" },
    { value: "Other", label: "Chi phí khác" },
];

export const expenseCategoryLabel = (value) => EXPENSE_CATEGORIES.find((option) => option.value === value)?.label ?? value;

// data is null when the receptionist has no open drawer
export const getCurrentCashSession = () => call(() => api.get("/api/cash-sessions/current"));

export const openCashSession = ({ openingCash, notes }) => call(() => api.post("/api/cash-sessions/open", { openingCash, notes: notes || null }));

export const addCashExpense = ({ amount, category, description }) =>
    call(() => api.post("/api/cash-sessions/current/expenses", { amount, category, description }));

export const removeCashExpense = (expenseId) => call(() => api.delete(`/api/cash-sessions/current/expenses/${expenseId}`));

export const closeCashSession = ({ countedCash, handoverToUserId, notes }) =>
    call(() => api.post("/api/cash-sessions/current/close", { countedCash, handoverToUserId: handoverToUserId || null, notes: notes || null }));

export const getHandoverCandidates = () => call(() => api.get("/api/cash-sessions/handover-candidates"));

export const getCashSessions = ({ page = 1, pageSize = 5 } = {}) =>
    call(() => api.get("/api/cash-sessions", { params: { pageNumber: page, pageSize } }));

export const getCashSession = (id) => call(() => api.get(`/api/cash-sessions/${id}`));
