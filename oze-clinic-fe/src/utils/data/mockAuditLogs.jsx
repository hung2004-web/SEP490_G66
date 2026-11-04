// TODO(api): mock only. The backend stores actions like APPOINTMENT_CREATED and only a user id, so map them when it has a read endpoint.
export const AUDIT_ACTIONS = {
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
};

export const AUDIT_ACTION_LABELS = {
    [AUDIT_ACTIONS.CREATE]: { label: "Tạo mới", variant: "success" },
    [AUDIT_ACTIONS.UPDATE]: { label: "Cập nhật", variant: "info" },
    [AUDIT_ACTIONS.DELETE]: { label: "Xoá", variant: "danger" },
};

export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(([value, { label }]) => ({ value, label }));

export const AUDIT_ENTITY_OPTIONS = [
    { value: "Appointment", label: "Lịch hẹn" },
    { value: "Service", label: "Dịch vụ" },
    { value: "Visit", label: "Lượt khám" },
    { value: "ToothChart", label: "Sơ đồ răng" },
    { value: "Payment", label: "Thanh toán" },
    { value: "ImagingResult", label: "Kết quả chụp" },
    { value: "Staff", label: "Nhân viên" },
    { value: "TreatmentPlan", label: "Kế hoạch điều trị" },
    { value: "PrescriptionLine", label: "Dòng đơn thuốc" },
];

const SAFARI_MAC = "Safari 17.6 · macOS 14.6";
const CHROME_WIN = "Chrome 130 · Windows 10";
const EDGE_WIN = "Edge 130 · Windows 11";

const LAN = { userId: "8f2c1a6e-4b7d-4e19-9a3c-5d20e7b1c604", userName: "Trần Thị Lan", userRole: "Quản lý", ipAddress: "192.168.1.10", userAgent: SAFARI_MAC };
const KHOA = { userId: "2b7e9d14-6c3a-4f80-b1d5-90a4c3e8f217", userName: "Trần Minh Khoa", userRole: "Bác sĩ", ipAddress: "192.168.1.21", userAgent: CHROME_WIN };
const MAI = { userId: "3a9d0b7c-1f42-4c88-b6e1-7c05d2a9f346", userName: "Lê Thị Mai", userRole: "Lễ tân", ipAddress: "192.168.1.31", userAgent: CHROME_WIN };
const DUC = { userId: "c71e5f20-9a3b-4d06-8e4f-1b68a0d7c952", userName: "Ngô Văn Đức", userRole: "Bác sĩ", ipAddress: "192.168.1.22", userAgent: CHROME_WIN };
const QUAN = { userId: "e4a06c38-7d15-49b2-a3f7-62c9b8d1e075", userName: "Hồ Minh Quân", userRole: "Kỹ thuật viên", ipAddress: "192.168.1.41", userAgent: EDGE_WIN };
const HA = { userId: "96d3f8a1-2e07-4b5c-9f16-a8c4e70d3b21", userName: "Lê Thu Hà", userRole: "Bác sĩ", ipAddress: "192.168.1.23", userAgent: CHROME_WIN };

// Newest first. changes: UPDATE only; data: CREATE and DELETE only. badge: variant for a value shown as a status.
export const MOCK_AUDIT_LOGS = [
    {
        id: 48318, ...LAN, action: AUDIT_ACTIONS.UPDATE, entityType: "Service", entityName: "Lấy cao răng", entityId: "2",
        createdAt: "2026-10-19T09:12:45+07:00",
        changes: [
            { field: "Giá dịch vụ", before: "200.000 ₫", after: "250.000 ₫" },
            { field: "Thời gian dự kiến", before: "30 phút", after: "40 phút" },
        ],
    },
    {
        id: 48317, ...KHOA, action: AUDIT_ACTIONS.UPDATE, entityType: "Visit", entityId: "1842",
        createdAt: "2026-10-19T09:08:10+07:00",
        changes: [{ field: "Chẩn đoán", before: "Viêm nướu", after: "Viêm nha chu mức độ nhẹ" }],
    },
    {
        id: 48311, ...MAI, action: AUDIT_ACTIONS.CREATE, entityType: "Appointment", entityId: "251",
        createdAt: "2026-10-19T09:05:33+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000203" },
            { field: "Ngày hẹn", value: "22/10/2026" },
            { field: "Khung giờ", value: "09:00 – 09:30" },
            { field: "Dịch vụ", value: "Khám tổng quát & tư vấn" },
            { field: "Trạng thái", value: "Chờ xác nhận", badge: "warning" },
        ],
    },
    {
        id: 48309, ...DUC, action: AUDIT_ACTIONS.CREATE, entityType: "ToothChart", entityId: "734",
        createdAt: "2026-10-19T08:58:02+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000187" },
            { field: "Răng", value: "36" },
            { field: "Tình trạng", value: "Sâu răng" },
        ],
    },
    {
        id: 48305, ...MAI, action: AUDIT_ACTIONS.UPDATE, entityType: "Payment", entityId: "5120",
        createdAt: "2026-10-19T08:51:47+07:00",
        changes: [
            { field: "Trạng thái", before: "Chưa thanh toán", after: "Đã thanh toán" },
            { field: "Phương thức", before: "Tiền mặt", after: "Chuyển khoản" },
        ],
    },
    {
        id: 48302, ...QUAN, action: AUDIT_ACTIONS.CREATE, entityType: "ImagingResult", entityId: "418",
        createdAt: "2026-10-19T08:45:12+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000198" },
            { field: "Loại chụp", value: "X-quang toàn cảnh" },
            { field: "Trạng thái", value: "Chờ duyệt", badge: "warning" },
        ],
    },
    {
        id: 48300, ...LAN, action: AUDIT_ACTIONS.UPDATE, entityType: "Staff", entityName: "Lê Thị Mai", entityId: "NV0012",
        createdAt: "2026-10-19T08:40:05+07:00",
        changes: [{ field: "Số điện thoại", before: "0912 111 222", after: "0912 111 333" }],
    },
    {
        id: 48298, ...HA, action: AUDIT_ACTIONS.UPDATE, entityType: "TreatmentPlan", entityId: "96",
        createdAt: "2026-10-19T08:32:19+07:00",
        changes: [{ field: "Số buổi dự kiến", before: "4 buổi", after: "6 buổi" }],
    },
    {
        id: 48297, ...DUC, action: AUDIT_ACTIONS.DELETE, entityType: "PrescriptionLine", entityId: "3051",
        createdAt: "2026-10-19T08:21:40+07:00",
        data: [
            { field: "Đơn thuốc", value: "#1207 · BN000187" },
            { field: "Tên thuốc", value: "Amoxicillin 500mg" },
            { field: "Liều dùng", value: "1 viên × 3 lần/ngày" },
            { field: "Số ngày dùng", value: "5 ngày" },
        ],
    },
    {
        id: 48290, ...MAI, action: AUDIT_ACTIONS.UPDATE, entityType: "Appointment", entityId: "248",
        createdAt: "2026-10-19T08:02:11+07:00",
        changes: [{ field: "Trạng thái", before: "Chờ xác nhận", after: "Đã xác nhận" }],
    },
    {
        id: 48274, ...MAI, action: AUDIT_ACTIONS.CREATE, entityType: "Appointment", entityId: "247",
        createdAt: "2026-10-18T16:47:26+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000201" },
            { field: "Ngày hẹn", value: "21/10/2026" },
            { field: "Khung giờ", value: "14:00 – 14:30" },
            { field: "Dịch vụ", value: "Lấy cao răng" },
            { field: "Trạng thái", value: "Chờ xác nhận", badge: "warning" },
        ],
    },
    {
        id: 48266, ...HA, action: AUDIT_ACTIONS.CREATE, entityType: "TreatmentPlan", entityId: "95",
        createdAt: "2026-10-18T15:30:58+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000176" },
            { field: "Tên kế hoạch", value: "Niềng răng mắc cài" },
            { field: "Số buổi dự kiến", value: "12 buổi" },
        ],
    },
    {
        id: 48259, ...LAN, action: AUDIT_ACTIONS.DELETE, entityType: "Service", entityName: "Tẩy trắng răng tại nhà", entityId: "17",
        createdAt: "2026-10-18T14:12:03+07:00",
        data: [
            { field: "Tên dịch vụ", value: "Tẩy trắng răng tại nhà" },
            { field: "Giá dịch vụ", value: "1.200.000 ₫" },
            { field: "Thời gian dự kiến", value: "20 phút" },
        ],
    },
    {
        id: 48251, ...QUAN, action: AUDIT_ACTIONS.UPDATE, entityType: "ImagingResult", entityId: "412",
        createdAt: "2026-10-18T11:05:44+07:00",
        changes: [{ field: "Ghi chú", before: "Ảnh mờ vùng răng 46", after: "Đã chụp lại vùng răng 46" }],
    },
    {
        id: 48243, ...KHOA, action: AUDIT_ACTIONS.CREATE, entityType: "Visit", entityId: "1835",
        createdAt: "2026-10-18T10:21:37+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000164" },
            { field: "Lý do khám", value: "Đau răng hàm dưới" },
        ],
    },
    {
        id: 48236, ...MAI, action: AUDIT_ACTIONS.UPDATE, entityType: "Payment", entityId: "5108",
        createdAt: "2026-10-18T09:44:15+07:00",
        changes: [{ field: "Số tiền đã thu", before: "500.000 ₫", after: "1.000.000 ₫" }],
    },
    {
        id: 48228, ...DUC, action: AUDIT_ACTIONS.UPDATE, entityType: "ToothChart", entityId: "729",
        createdAt: "2026-10-17T16:18:52+07:00",
        changes: [{ field: "Tình trạng răng 16", before: "Sâu răng", after: "Đã trám" }],
    },
    {
        id: 48219, ...LAN, action: AUDIT_ACTIONS.CREATE, entityType: "Staff", entityName: "Hồ Minh Quân", entityId: "NV0018",
        createdAt: "2026-10-17T14:02:29+07:00",
        data: [
            { field: "Họ và tên", value: "Hồ Minh Quân" },
            { field: "Vai trò", value: "Kỹ thuật viên" },
            { field: "Trạng thái", value: "Đang hoạt động", badge: "success" },
        ],
    },
    {
        id: 48207, ...MAI, action: AUDIT_ACTIONS.DELETE, entityType: "Appointment", entityId: "231",
        createdAt: "2026-10-17T10:36:08+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000152" },
            { field: "Ngày hẹn", value: "18/10/2026" },
            { field: "Khung giờ", value: "10:00 – 10:30" },
            { field: "Dịch vụ", value: "Khám tổng quát & tư vấn" },
        ],
    },
    {
        id: 48195, ...HA, action: AUDIT_ACTIONS.CREATE, entityType: "PrescriptionLine", entityId: "3027",
        createdAt: "2026-10-16T15:52:41+07:00",
        data: [
            { field: "Đơn thuốc", value: "#1198 · BN000143" },
            { field: "Tên thuốc", value: "Paracetamol 500mg" },
            { field: "Liều dùng", value: "1 viên × 2 lần/ngày" },
            { field: "Số ngày dùng", value: "3 ngày" },
        ],
    },
    {
        id: 48182, ...LAN, action: AUDIT_ACTIONS.UPDATE, entityType: "Service", entityName: "Nhổ răng khôn", entityId: "9",
        createdAt: "2026-10-16T11:27:16+07:00",
        changes: [{ field: "Giá dịch vụ", before: "1.500.000 ₫", after: "1.800.000 ₫" }],
    },
    {
        id: 48170, ...KHOA, action: AUDIT_ACTIONS.UPDATE, entityType: "TreatmentPlan", entityId: "88",
        createdAt: "2026-10-16T09:13:50+07:00",
        changes: [{ field: "Trạng thái", before: "Đang điều trị", after: "Hoàn thành" }],
    },
    {
        id: 48158, ...QUAN, action: AUDIT_ACTIONS.CREATE, entityType: "ImagingResult", entityId: "403",
        createdAt: "2026-10-15T14:40:22+07:00",
        data: [
            { field: "Bệnh nhân", value: "BN000131" },
            { field: "Loại chụp", value: "CT Cone Beam" },
            { field: "Trạng thái", value: "Đã duyệt", badge: "success" },
        ],
    },
    {
        id: 48146, ...MAI, action: AUDIT_ACTIONS.UPDATE, entityType: "Appointment", entityId: "219",
        createdAt: "2026-10-15T08:55:07+07:00",
        changes: [{ field: "Ngày hẹn", before: "16/10/2026", after: "20/10/2026" }],
    },
];
