import { REFUND_REQUEST_STATUSES } from "@/utils/data/mockRefundRequests";

export const PLAN_PAY_TYPE = { 7101: "installment", 7102: "step" };

const line = (name, detail, quantity, unitPrice, discount) => ({ name, detail, quantity, unitPrice, discount });
const payment = (date, amount, method) => ({ date, amount, method });

const RECEIPTS = {
    7008: { lines: [line("Điều trị tủy răng 46", "Bước 2: trám bít 3 ống tủy", 1, 1100000, 0)], payments: [payment("31/10/2026", 1100000, "BANK_TRANSFER")] },
    7007: { lines: [line("Niềng răng mắc cài kim loại", "Hai hàm · khoảng 18 tháng · thanh toán 3 đợt", 1, 27000000, 0)], payments: [payment("15/10/2026", 9000000, "CASH")] },
    7006: { lines: [line("Điều trị tủy răng 46", "Bước 1: lấy tủy, làm sạch ống tủy", 1, 1500000, 0)], payments: [payment("08/10/2026", 1500000, "CASH")] },
    7005: { lines: [line("Lấy cao răng", "Lấy cao răng, đánh bóng hai hàm", 1, 350000, 50000)], payments: [payment("02/08/2026", 300000, "CASH")] },
    7004: { lines: [line("Trám răng", "Composite răng 16 mặt nhai", 1, 350000, 0)], payments: [payment("20/05/2026", 350000, "CASH")] },
    7003: { lines: [line("Khám định kỳ", "Khám tổng quát, chụp ảnh trong miệng", 1, 100000, 0)], payments: [payment("14/03/2026", 100000, "CASH")] },
    7002: {
        lines: [line("Chụp X-quang quanh chóp", "Răng 36", 1, 100000, 0), line("Trám răng", "Composite răng 36 mặt nhai – xa", 1, 400000, 0)],
        payments: [payment("10/01/2026", 500000, "BANK_TRANSFER")],
    },
    7001: {
        lines: [
            line("Khám tổng quát lần đầu", "Khám tổng quát", 1, 100000, 0),
            line("Chụp phim Panorama", "Toàn hàm (trung tâm liên kết)", 1, 200000, 0),
            line("Lấy cao răng", "Lấy cao răng, đánh bóng hai hàm", 1, 300000, 0),
        ],
        payments: [payment("12/07/2025", 600000, "CASH")],
    },
};

const STAGE_RECEIPTS = { 7101: { "Đợt 1": 7007 }, 7102: { "Bước 1": 7006, "Bước 2": 7008 } };

const { PENDING, APPROVED, REFUNDED, REJECTED } = REFUND_REQUEST_STATUSES;

const REFUNDS = [
    { code: "HT0004", visitId: 7007, stage: "Đợt 1", amount: 200000, status: PENDING, createdAt: "01/11/2026" },
    { code: "HT0003", visitId: 7006, stage: "Bước 1", amount: 150000, status: APPROVED, createdAt: "25/10/2026" },
    { code: "HT0002", visitId: 7002, stage: null, amount: 100000, status: REFUNDED, createdAt: "15/01/2026" },
    { code: "HT0001", visitId: 7005, stage: null, amount: 300000, status: REJECTED, createdAt: "05/08/2026" },
];

const OVERDUE_UNPAID_VISIT = 7008;

const withOverdue = (receipts) => ({ ...receipts, [OVERDUE_UNPAID_VISIT]: { ...receipts[OVERDUE_UNPAID_VISIT], payments: [] } });

export const buildPatientDebtMock = (mode) =>
    structuredClone({
        planPayType: PLAN_PAY_TYPE,
        receipts: mode === "overdue" ? withOverdue(RECEIPTS) : RECEIPTS,
        stageReceipts: STAGE_RECEIPTS,
        refunds: REFUNDS,
    });
