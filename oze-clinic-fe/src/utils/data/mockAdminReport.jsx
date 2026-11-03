// Mock data for the clinic manager's report page.
// TODO(api): the backend has no report endpoints yet.

// Share of revenue per service, biggest first (the chart has 8 colours, so at most 8 items; "Khác" is the rest).
export const MOCK_REVENUE_SHARES = [
    { label: "Niềng răng", share: 0.33 },
    { label: "Bọc răng sứ", share: 0.23 },
    { label: "Điều trị tủy", share: 0.14 },
    { label: "Cấy ghép Implant", share: 0.12 },
    { label: "Khám & trám", share: 0.04 },
    { label: "Khác", share: 0.14 },
];

// Share of booked appointments that were cancelled / missed, to fill the "Lịch hẹn trong kỳ" tile.
export const MOCK_APPOINTMENT_RATES = { cancelled: 0.09, noShow: 0.05 };

// Invoices not fully paid, biggest debts first. remaining in VND.
export const MOCK_DEBTS = {
    total: 23400000,
    invoiceCount: 5,
    items: [
        { invoiceCode: "HD000188", patientName: "Vũ Đức Long", note: "Kế hoạch · Niềng răng mắc cài kim loại", remaining: 8000000 },
        { invoiceCode: "HD000192", patientName: "Lê Hoàng Yến", note: "Kế hoạch · Cấy ghép Implant 46", remaining: 12000000 },
        { invoiceCode: "HD000201", patientName: "Trịnh Văn Khải", note: "Kế hoạch · Bọc răng sứ 26", remaining: 2000000 },
    ],
};

export const REQUEST_TYPES = {
    LEAVE: "leave",
    REFUND: "refund",
};

// Requests waiting for the manager. senderDetail: staff role, or the patient code for a refund. submittedAt: local date-time.
export const MOCK_PENDING_REQUESTS = [
    { id: 1, type: REQUEST_TYPES.LEAVE, senderName: "Trần Minh Khoa", senderDetail: "Bác sĩ", content: "23/10/2026 · Cả ngày · Việc gia đình", submittedAt: "2026-10-17T08:12" },
    { id: 2, type: REQUEST_TYPES.LEAVE, senderName: "Lê Thị Mai", senderDetail: "Lễ tân", content: "05/11/2026 · Ca chiều · Khám sức khoẻ định kỳ", submittedAt: "2026-10-18T16:40" },
    { id: 3, type: REQUEST_TYPES.LEAVE, senderName: "Phạm Quốc Bảo", senderDetail: "KTV chụp X-quang", content: "28/10/2026 · Ca sáng · Phẫu thuật nhỏ", submittedAt: "2026-10-19T07:55" },
    { id: 4, type: REQUEST_TYPES.REFUND, senderName: "Nguyễn Văn A", senderDetail: "BN000123", content: "HD000165 · cần hoàn 300.000 ₫", submittedAt: "2026-09-25T09:10" },
    { id: 5, type: REQUEST_TYPES.REFUND, senderName: "Lê Văn Nam", senderDetail: "BN000125", content: "HD000202 · cần hoàn 800.000 ₫", submittedAt: "2026-10-19T09:01" },
];
