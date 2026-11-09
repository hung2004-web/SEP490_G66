import { QUEUE_STATUS } from "../messages";

// Sample data for the doctor's exam screen (/doctor/queue): queue of the shift and one record per patient.

export const MOCK_EXAM_SHIFT = { name: "Ca sáng", start: "08:00", end: "12:00", roomName: "Phòng khám" };

export const MOCK_EXAM_QUEUE = [
    { id: 1, queueNumber: 8, patientName: "Nguyễn Văn A", status: QUEUE_STATUS.CALLED },
    { id: 2, queueNumber: 9, patientName: "Lý Thanh Tâm", status: QUEUE_STATUS.WAITING },
    { id: 3, queueNumber: 10, patientName: "Mai Thị Lan", status: QUEUE_STATUS.WAITING },
    { id: 4, queueNumber: 11, patientName: "Đinh Thu Hà", status: QUEUE_STATUS.WAITING },
    { id: 5, queueNumber: 12, patientName: "Ngô Minh Anh", status: QUEUE_STATUS.WAITING },
];

export const MOCK_EXAM_DONE_COUNT = 2;

const GENERAL_CHECKUP = { id: 1, name: "Khám tổng quát" };
const SCALING = { id: 2, name: "Lấy cao răng" };
const FILLING = { id: 3, name: "Trám răng" };
const ROOT_CANAL = { id: 4, name: "Điều trị tủy" };
const WHITENING = { id: 5, name: "Tẩy trắng răng" };

// Visit record per queue entry (key = queue id): patient, booked services, check-in, history, previous visits.
// visits[].historyItems: what "Bổ sung" copies into the dental history.
export const MOCK_EXAM_RECORDS = {
    1: {
        encounterCode: "LK-1019-012",
        patient: {
            code: "BN000123",
            name: "Nguyễn Văn A",
            gender: "male",
            birthdate: "1998-05-14",
            age: 28,
            phone: "0912345678",
            emergencyPhone: "0912777345",
            address: "Số 12, Đại Mỗ, Nam Từ Liêm, Hà Nội",
        },
        services: [GENERAL_CHECKUP, SCALING, FILLING],
        intake: { reason: "Đau răng hàm dưới, muốn lấy cao răng", checkInAt: "08:21", appointmentTime: "08:30" },
        history: { allergies: ["Penicillin"], conditions: ["Tăng huyết áp"], dental: ["Ê buốt răng", "Từng nhổ răng"] },
        visits: [
            { id: 9001, date: "15/07/2026", doctor: "BS. Trần Minh Khoa", summary: "Lấy cao răng định kỳ · Cao răng (K03.6)", historyItems: [] },
            { id: 9002, date: "02/03/2026", doctor: "BS. Lê Thu Hà", summary: "Ê buốt răng 36 · Sâu ngà răng 36 (K02.1)", historyItems: ["Ê buốt răng", "Từng trám răng 36"] },
        ],
    },
    2: {
        encounterCode: "LK-1019-013",
        patient: {
            code: "BN000187",
            name: "Lý Thanh Tâm",
            gender: "male",
            birthdate: "1985-11-02",
            age: 41,
            phone: "0903456123",
            emergencyPhone: "",
            address: "45 Trần Duy Hưng, Cầu Giấy, Hà Nội",
        },
        services: [ROOT_CANAL],
        intake: { reason: "Đau nhức răng hàm trên bên phải về đêm", checkInAt: "08:35", appointmentTime: "09:00" },
        history: { allergies: [], conditions: ["Tiểu đường"], dental: ["Từng điều trị tủy"] },
        visits: [{ id: 9010, date: "10/01/2026", doctor: "BS. Trần Minh Khoa", summary: "Viêm tủy răng 16 · Điều trị tủy (K04.0)", historyItems: ["Từng điều trị tủy"] }],
    },
    3: {
        encounterCode: "LK-1019-014",
        patient: {
            code: "BN000204",
            name: "Mai Thị Lan",
            gender: "female",
            birthdate: "1996-03-21",
            age: 30,
            phone: "0987001234",
            emergencyPhone: "0987001999",
            address: "8 Kim Mã, Ba Đình, Hà Nội",
        },
        services: [GENERAL_CHECKUP, WHITENING],
        intake: { reason: "Muốn tẩy trắng răng", checkInAt: "08:42", appointmentTime: null },
        history: { allergies: [], conditions: ["Đang cho con bú"], dental: [] },
        visits: [],
    },
    4: {
        encounterCode: "LK-1019-015",
        patient: {
            code: "BN000211",
            name: "Đinh Thu Hà",
            gender: "female",
            birthdate: "2001-08-09",
            age: 25,
            phone: "0978222333",
            emergencyPhone: "",
            address: "102 Nguyễn Văn Cừ, Long Biên, Hà Nội",
        },
        services: [SCALING],
        intake: { reason: "Lấy cao răng định kỳ", checkInAt: "08:50", appointmentTime: "09:30" },
        history: { allergies: ["Latex (găng cao su)"], conditions: [], dental: ["Chảy máu chân răng"] },
        visits: [{ id: 9020, date: "20/02/2026", doctor: "BS. Lê Thu Hà", summary: "Viêm lợi · Lấy cao răng (K05.1)", historyItems: ["Chảy máu chân răng"] }],
    },
    5: {
        encounterCode: "LK-1019-016",
        patient: {
            code: "BN000230",
            name: "Ngô Minh Anh",
            gender: "male",
            birthdate: "2010-12-30",
            age: 15,
            phone: "0966777888",
            emergencyPhone: "0966777000",
            address: "3 Lê Văn Lương, Thanh Xuân, Hà Nội",
        },
        services: [GENERAL_CHECKUP, FILLING],
        intake: { reason: "Răng cửa bị mẻ khi chơi thể thao", checkInAt: "09:02", appointmentTime: null },
        history: { allergies: [], conditions: ["Hen suyễn / bệnh phổi"], dental: [] },
        visits: [],
    },
};

// Sample findings of step 2 ("Khám & chẩn đoán") for the first patient.
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
