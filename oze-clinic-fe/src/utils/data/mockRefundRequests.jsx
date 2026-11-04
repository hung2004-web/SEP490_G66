export const REFUND_REQUEST_STATUSES = {
    PENDING: "pending",
    APPROVED: "approved",
    REFUNDED: "refunded",
    REJECTED: "rejected",
};

export const REFUND_REQUEST_STATUS_LABELS = {
    [REFUND_REQUEST_STATUSES.PENDING]: { label: "Chờ duyệt", badge: "badge-warning" },
    [REFUND_REQUEST_STATUSES.APPROVED]: { label: "Đã duyệt", badge: "badge-info" },
    [REFUND_REQUEST_STATUSES.REFUNDED]: { label: "Đã hoàn tiền", badge: "badge-success" },
    [REFUND_REQUEST_STATUSES.REJECTED]: { label: "Từ chối", badge: "badge-danger" },
};

const { PENDING, APPROVED, REFUNDED, REJECTED } = REFUND_REQUEST_STATUSES;

// doctorId and requestedById: ids in MOCK_STAFF.
export const MOCK_REFUND_REQUESTS = [
    { id: 1, code: "RF000012", patientName: "Nguyễn Văn A", patientCode: "BN000123", doctorId: 12, requestedById: 24, createdAt: "2026-09-25T09:10:00+07:00", invoiceNumber: "HD000165", serviceNames: "Khám tổng quát · Lấy cao răng", treatmentContent: "Lấy cao răng toàn hàm, đánh bóng", paidAmount: 450000, reason: "Thu trùng phí lấy cao răng đã có trong gói khám định kỳ.", status: PENDING, rejectReason: null },
    { id: 2, code: "RF000018", patientName: "Lê Văn Nam", patientCode: "BN000125", doctorId: 15, requestedById: 36, createdAt: "2026-10-19T09:01:00+07:00", invoiceNumber: "HD000202", serviceNames: "Trám răng", treatmentContent: "Trám răng 36, 37", paidAmount: 800000, reason: "Bệnh nhân chỉ trám 1 răng nhưng hoá đơn tính 2 răng.", status: PENDING, rejectReason: null },
    { id: 3, code: "RF000017", patientName: "Đỗ Mai Khanh", patientCode: "BN000133", doctorId: 12, requestedById: 24, createdAt: "2026-10-17T15:20:00+07:00", invoiceNumber: "HD000171", serviceNames: "Khám tổng quát", treatmentContent: "Khám và tư vấn, không điều trị", paidAmount: 400000, reason: "Thanh toán hai lần cho cùng một hoá đơn.", status: REFUNDED, rejectReason: null },
    { id: 4, code: "RF000016", patientName: "Vũ Đức Long", patientCode: "BN000118", doctorId: 30, requestedById: 36, createdAt: "2026-10-12T10:45:00+07:00", invoiceNumber: "HD000150", serviceNames: "Điều trị tủy", treatmentContent: "Điều trị tủy răng 46", paidAmount: 1500000, reason: "Bệnh nhân không hài lòng và muốn hoàn phí điều trị.", status: REJECTED, rejectReason: "Dịch vụ đã thực hiện đầy đủ, bác sĩ xác minh không có sai sót." },
    { id: 5, code: "RF000015", patientName: "Trần Thị Hoa", patientCode: "BN000101", doctorId: 15, requestedById: 24, createdAt: "2026-10-05T14:05:00+07:00", invoiceNumber: "HD000141", serviceNames: "Nhổ răng khôn", treatmentContent: "Huỷ ca nhổ răng 48 do chống chỉ định", paidAmount: 1250000, reason: "Ca nhổ răng bị huỷ sau khi bệnh nhân đã thanh toán.", status: REFUNDED, rejectReason: null },
    { id: 6, code: "RF000014", patientName: "Phan Quốc Bình", patientCode: "BN000097", doctorId: 39, requestedById: 45, createdAt: "2026-09-28T08:40:00+07:00", invoiceNumber: "HD000136", serviceNames: "Chụp X-quang toàn cảnh", treatmentContent: "Không thực hiện do máy bảo trì", paidAmount: 250000, reason: "Dịch vụ chưa được thực hiện.", status: APPROVED, rejectReason: null },
    { id: 7, code: "RF000011", patientName: "Hoàng Thu Thảo", patientCode: "BN000090", doctorId: 12, requestedById: 24, createdAt: "2026-09-18T16:30:00+07:00", invoiceNumber: "HD000122", serviceNames: "Lấy cao răng", treatmentContent: "Lấy cao răng toàn hàm", paidAmount: 300000, reason: "Áp dụng thiếu mã giảm giá khi thanh toán.", status: REJECTED, rejectReason: "Mã giảm giá đã hết hạn tại thời điểm thanh toán." },
];
