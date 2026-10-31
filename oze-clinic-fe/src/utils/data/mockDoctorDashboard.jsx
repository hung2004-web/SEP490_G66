// Mock data for the doctor's "Tổng quan" page (BS. Trần Minh Khoa).
// TODO(api): the backend has no queue / review endpoints for doctors yet.

export const DOCTOR_TASK_TYPES = {
    IMAGING_REVIEW: "imaging_review",
    REFUND_REVIEW: "refund_review",
};

// Today's shift. start / end: HH:mm.
export const MOCK_DOCTOR_SHIFT = { name: "Ca sáng", start: "08:00", end: "12:00", roomName: "Phòng khám" };

// Patients already examined today, and imaging results the technicians sent for review.
export const MOCK_DOCTOR_TODAY = { completed: 3, pendingImagingResults: 2 };

// Waiting queue, first in line first. appointmentTime null = walk-in; waitedMinutes: since check-in.
export const MOCK_DOCTOR_QUEUE = [
    { id: 1, queueNumber: 8, patientName: "Nguyễn Văn A", gender: "Nam", age: 28, appointmentTime: "08:30", checkInAt: "08:21", waitedMinutes: 47, allergy: "Penicillin", reason: "Đau răng, muốn lấy cao răng" },
    { id: 2, queueNumber: 9, patientName: "Lý Thanh Tâm", gender: "Nữ", age: 35, appointmentTime: "09:00", checkInAt: "08:47", waitedMinutes: 21, allergy: null, reason: "Lấy cao răng định kỳ" },
    { id: 3, queueNumber: 10, patientName: "Mai Thị Lan", gender: "Nữ", age: 42, appointmentTime: null, checkInAt: "08:50", waitedMinutes: 18, allergy: "Lidocaine", reason: "Ê buốt răng cửa" },
    { id: 4, queueNumber: 11, patientName: "Đinh Thu Hà", gender: "Nữ", age: 24, appointmentTime: null, checkInAt: "08:58", waitedMinutes: 10, allergy: null, reason: "Tư vấn trồng răng" },
];

export const MOCK_DOCTOR_TASKS = [
    { id: 1, type: DOCTOR_TASK_TYPES.IMAGING_REVIEW, title: "Duyệt kết quả chụp", detail: "Đỗ Mai Khanh · X-quang toàn cảnh", status: "Chờ duyệt" },
    { id: 2, type: DOCTOR_TASK_TYPES.IMAGING_REVIEW, title: "Duyệt kết quả chụp", detail: "Phan Gia Bảo · X-quang toàn cảnh", status: "Chờ duyệt" },
    { id: 3, type: DOCTOR_TASK_TYPES.REFUND_REVIEW, title: "Duyệt hoàn tiền", detail: "Nguyễn Văn A · HD000165 · 300.000 ₫", status: "Chờ bạn duyệt" },
];
