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
