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
