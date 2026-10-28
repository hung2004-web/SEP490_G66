// Mock data for the clinic manager's report page.
// TODO(api): the backend has no report endpoints yet.

// Share of revenue per service, biggest first; "Khác" (other: true) is the rest.
export const MOCK_REVENUE_SHARES = [
    { label: "Niềng răng", share: 0.33 },
    { label: "Bọc răng sứ", share: 0.23 },
    { label: "Điều trị tuỷ", share: 0.14 },
    { label: "Cấy ghép Implant", share: 0.12 },
    { label: "Khám tổng quát", share: 0.04 },
    { label: "Khác", share: 0.14, other: true },
];

export const MOCK_TODAY_APPOINTMENTS = { total: 8, checkedIn: 7, notArrived: 1 };

export const REQUEST_TYPES = {
    LEAVE: "leave",
    REFUND: "refund",
};

// Requests waiting for the manager. submittedAt: local date-time.
export const MOCK_PENDING_REQUESTS = [
    { id: 1, type: REQUEST_TYPES.LEAVE, senderName: "BS. Trần Minh Khoa", senderRole: "Bác sĩ", content: "T6 06/11 · Cả ngày · Việc gia đình", submittedAt: "2026-10-27T08:12" },
    { id: 2, type: REQUEST_TYPES.LEAVE, senderName: "Lê Thị Mai", senderRole: "Lễ tân", content: "T5 05/11 · Ca chiều · Khám sức khoẻ định kỳ", submittedAt: "2026-10-27T16:40" },
    { id: 3, type: REQUEST_TYPES.LEAVE, senderName: "KTV. Phạm Quốc Bảo", senderRole: "KTV hình ảnh", content: "09 – 13/11 · Phẫu thuật nhỏ", submittedAt: "2026-10-28T07:55" },
    { id: 4, type: REQUEST_TYPES.REFUND, senderName: "Nguyễn Văn A", senderRole: "BS. Khoa đã duyệt cấp 1", content: "HD000165 · Lấy cao răng · 300.000 ₫", submittedAt: "2026-10-28T09:10" },
    { id: 5, type: REQUEST_TYPES.REFUND, senderName: "Đỗ Mai Khanh", senderRole: "BS. Hà đã duyệt cấp 1", content: "HD000171 · Trám răng · 800.000 ₫", submittedAt: "2026-10-28T10:02" },
];
