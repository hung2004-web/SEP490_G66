import { QUEUE_STATUS } from "../messages";

// Sample data for the doctor's exam screen components (queue, patient header, exam tab).

export const MOCK_EXAM_SHIFT = { name: "Ca sáng", start: "08:00", end: "12:00", roomName: "Phòng khám" };

export const MOCK_EXAM_QUEUE = [
    { id: 1, queueNumber: 8, patientName: "Nguyễn Văn A", status: QUEUE_STATUS.CALLED },
    { id: 2, queueNumber: 9, patientName: "Lý Thanh Tâm", status: QUEUE_STATUS.WAITING },
    { id: 3, queueNumber: 10, patientName: "Mai Thị Lan", status: QUEUE_STATUS.WAITING },
    { id: 4, queueNumber: 11, patientName: "Đinh Thu Hà", status: QUEUE_STATUS.WAITING },
    { id: 5, queueNumber: 12, patientName: "Ngô Minh Anh", status: QUEUE_STATUS.WAITING },
];

export const MOCK_EXAM_DONE_COUNT = 2;

// Patient called in (queue number 8), shown by PatientCard.
export const MOCK_EXAM_PATIENT = { name: "Nguyễn Văn A", code: "BN000123", gender: "male", age: 28, queueNumber: 8 };

export const MOCK_EXAM_PATIENT_STATUS = { label: "Đã gọi · chờ vào phòng", tone: "warning" };

export const MOCK_EXAM_SERVICES = [
    { id: 1, name: "Khám tổng quát" },
    { id: 2, name: "Lấy cao răng" },
    { id: 3, name: "Trám răng" },
];

// What reception recorded at check-in, shown by ExamPreStart.
export const MOCK_EXAM_INTAKE = {
    allergies: ["Penicillin"],
    reason: "Đau răng hàm dưới, muốn lấy cao răng",
    conditions: ["Viêm xoang"],
    checkInAt: "08:21",
    appointmentTime: "08:30",
};

// Findings on the exam chart (same shape as the medical record chart), shown by ExamDentalChart / ToothConditionTable.
export const MOCK_EXAM_TOOTH_ENTRIES = [
    { id: 1, tooth: 36, surf: "OD", kind: "caries", st: "condition", note: "Sâu ngà mặt nhai – xa" },
    { id: 2, tooth: 46, kind: "pulp", st: "condition", note: "Đau tự phát về đêm, nghi viêm tủy" },
    { id: 3, tooth: 26, surf: "O", kind: "filling", st: "done", note: "Miếng trám composite cũ còn tốt" },
    { id: 4, tooth: 38, kind: "impacted", st: "watch", note: "Răng khôn mọc lệch, theo dõi" },
];

export const MOCK_EXAM_SYMPTOMS = ["Đau răng", "Ê buốt khi ăn lạnh", "Cao răng nhiều"];

export const MOCK_EXAM_FILMS = [
    { id: 1, code: "XQ260011", type: "X-quang quanh chóp", area: "Răng 46", status: "concluded", requestedAt: "08:40" },
    { id: 2, code: "XQ260012", type: "X-quang toàn cảnh (Panorama)", area: "Toàn hàm", status: "requested", requestedAt: "08:52" },
];

export const MOCK_EXAM_DIAGNOSES = [
    { id: 1, code: "K02.1", name: "Sâu ngà răng", teeth: "36" },
    { id: 2, code: "K04.0", name: "Viêm tủy răng", teeth: "46" },
    { id: 3, code: "K03.6", name: "Cao răng (lắng đọng trên răng)", teeth: "" },
];
