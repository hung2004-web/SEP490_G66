import { QUEUE_STATUS } from "../messages";

// Sample data for the doctor's exam screen (/doctor/examination): queue of the shift and one record per patient.

export const MOCK_EXAM_SHIFT = { name: "Ca sáng", start: "08:00", end: "12:00", roomName: "Phòng khám" };

export const MOCK_EXAM_QUEUE = [
    { id: 1, queueNumber: 8, patientName: "Nguyễn Văn A", status: QUEUE_STATUS.WAITING },
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

const step = (name, status, note) => ({ name, status, note });
const drug = (id, name, strength, quantity, usage) => ({ id, name, strength, quantity, usage });

// Details of the previous visits, opened by "Xem chi tiết" (key = visit id).
// plan.stages[].status: done | next | todo (same as TreatmentStepList). plan / prescription are null when the visit had none.
const VISIT_DETAILS = {
    9001: {
        service: "Lấy cao răng",
        reason: "Lấy cao răng định kỳ 6 tháng",
        diagnoses: [{ code: "K03.6", name: "Cao răng (lắng đọng trên răng)", teeth: "Hai hàm" }],
        done: ["Lấy cao răng siêu âm hai hàm", "Đánh bóng mặt răng", "Hướng dẫn chải răng và dùng chỉ nha khoa"],
        plan: null,
        prescription: null,
        nextVisit: "Khám định kỳ sau 6 tháng (khoảng 01/2027)",
    },
    9002: {
        service: "Khám tổng quát · Trám răng",
        reason: "Ê buốt răng hàm dưới bên trái khi ăn lạnh",
        diagnoses: [
            { code: "K02.1", name: "Sâu ngà răng", teeth: "36" },
            { code: "K02.0", name: "Sâu men răng", teeth: "37" },
        ],
        done: ["Chụp X-quang quanh chóp răng 36", "Nạo ngà sâu, trám composite răng 36 mặt nhai – xa"],
        plan: {
            code: "KH000231",
            name: "Điều trị sâu răng hàm dưới trái",
            teeth: "36, 37",
            status: "active",
            start: "02/03/2026",
            duration: "Khoảng 2 buổi",
            stages: [
                step("Trám composite răng 36", "done", "02/03/2026 · BS. Lê Thu Hà"),
                step("Trám phòng ngừa răng 37", "next", "Chưa đặt lịch"),
            ],
        },
        prescription: {
            note: "Uống thuốc sau ăn. Tránh đồ quá nóng/lạnh 24 giờ sau trám.",
            items: [drug(1, "Paracetamol", "500 mg", "10 viên", "Uống 1 viên khi đau, cách nhau ít nhất 4–6 giờ, tối đa 4 viên/ngày")],
        },
        nextVisit: "Trám răng 37 · bệnh nhân chưa đặt lịch",
    },
    9010: {
        service: "Điều trị tủy",
        reason: "Đau nhức răng hàm trên bên phải về đêm",
        diagnoses: [{ code: "K04.0", name: "Viêm tủy răng không hồi phục", teeth: "16" }],
        done: ["Chụp X-quang quanh chóp răng 16", "Gây tê, mở tủy, lấy tủy buồng và tủy chân", "Làm sạch, đặt thuốc ống tủy"],
        plan: {
            code: "KH000198",
            name: "Điều trị tủy và bọc sứ răng 16",
            teeth: "16",
            status: "active",
            start: "10/01/2026",
            duration: "Khoảng 1 tháng",
            stages: [
                step("Lấy tủy, làm sạch ống tủy", "done", "10/01/2026"),
                step("Trám bít ống tủy", "done", "24/01/2026"),
                step("Bọc mão sứ răng 16", "next", "Hẹn khi bệnh nhân sẵn sàng"),
            ],
        },
        prescription: {
            note: "Uống đủ liều kháng sinh kể cả khi hết đau. Quay lại ngay nếu sưng má.",
            items: [
                drug(1, "Amoxicillin", "500 mg", "15 viên", "Uống 1 viên × 3 lần/ngày sau ăn, trong 5 ngày"),
                drug(2, "Metronidazol", "250 mg", "15 viên", "Uống 1 viên × 3 lần/ngày sau ăn, trong 5 ngày"),
                drug(3, "Paracetamol", "500 mg", "10 viên", "Uống 1 viên khi đau, tối đa 4 viên/ngày"),
            ],
        },
        nextVisit: "24/01/2026 · Trám bít ống tủy",
    },
    9020: {
        service: "Lấy cao răng",
        reason: "Chảy máu chân răng khi chải răng",
        diagnoses: [{ code: "K05.1", name: "Viêm lợi mạn tính", teeth: "Hai hàm" }],
        done: ["Lấy cao răng siêu âm hai hàm", "Bơm rửa túi lợi"],
        plan: null,
        prescription: {
            note: "Không ăn uống trong 30 phút sau khi súc miệng.",
            items: [drug(1, "Chlorhexidine 0,12% (nước súc miệng)", "0,12%", "1 chai 250 ml", "Súc miệng 15 ml × 2 lần/ngày sau chải răng, trong 7 ngày")],
        },
        nextVisit: "Khám lại sau 2 tuần để kiểm tra lợi",
    },
};

// Visit record per queue entry (key = queue id): patient, booked services, check-in, history, previous visits.
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
            { id: 9001, date: "15/07/2026", doctor: "BS. Trần Minh Khoa", summary: "Lấy cao răng định kỳ · Cao răng (K03.6)", detail: VISIT_DETAILS[9001] },
            { id: 9002, date: "02/03/2026", doctor: "BS. Lê Thu Hà", summary: "Ê buốt răng 36 · Sâu ngà răng 36 (K02.1)", detail: VISIT_DETAILS[9002] },
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
        visits: [{ id: 9010, date: "10/01/2026", doctor: "BS. Trần Minh Khoa", summary: "Viêm tủy răng 16 · Điều trị tủy (K04.0)", detail: VISIT_DETAILS[9010] }],
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
        visits: [{ id: 9020, date: "20/02/2026", doctor: "BS. Lê Thu Hà", summary: "Viêm lợi · Lấy cao răng (K05.1)", detail: VISIT_DETAILS[9020] }],
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

// Step 2 "Khám & chẩn đoán" draft of each visit (key = queue id). Patients not listed start empty.
// entries: tooth findings { id, tooth, condition (free text), surfaces: ["O", "D"], note, replaced? (primary tooth) }.
// films: X-ray orders { id, code, type, area, purpose, status (XRAY_STATUS key), sentAt?, visitDate? }.
// diagnoses: { id, code (ICD10_DENTAL), teeth: ["36"], note }.
export const MOCK_EXAM_DRAFTS = {
    1: {
        symptoms: ["Ê buốt khi ăn nóng / lạnh", "Đau khi nhai", "Sưng lợi"],
        note: "",
        entries: [
            { id: 1, tooth: 36, condition: "Sâu răng", surfaces: ["O", "D"], note: "Sâu ngà mặt nhai – xa, đáy lỗ sâu sát tủy." },
            { id: 2, tooth: 36, condition: "Mòn cổ răng", surfaces: ["B"], note: "Mòn cổ răng mặt ngoài, ê khi chải răng." },
            { id: 3, tooth: 37, condition: "Sâu răng", surfaces: ["O"], note: "Sâu men mặt nhai, thử lạnh ê nhẹ." },
        ],
        films: [
            { id: 1, code: "YC000330", type: "X-quang quanh chóp", area: "Răng 36", purpose: "", status: "requested", sentAt: "09:25" },
            { id: 2, code: "YC000289", type: "X-quang toàn cảnh", area: "Toàn hàm", purpose: "", status: "reviewed", visitDate: "15/07/2026" },
        ],
        diagnoses: [
            { id: 1, code: "K04.0", teeth: ["36"], note: "Viêm tủy răng 36. Đau tự phát, thử lạnh đau kéo dài > 10 giây." },
            { id: 2, code: "K03.6", teeth: ["31", "32", "41", "42"], note: "Cao răng mặt trong hàm dưới." },
        ],
    },
};

export const EMPTY_EXAM_DRAFT = { symptoms: [], note: "", entries: [], films: [], diagnoses: [] };

// Step 4 draft: the plan session done today, what was done (items), a note, and the proposed check-up date
// (followUpDate, "yyyy-mm-dd" or "", only once the whole plan is done).
export const EMPTY_TREATMENT_DRAFT = { sessionId: "", items: [], note: "", followUpDate: "" };

// Step 5 draft: the prescribed medicines (PrescriptionItems) and the prescription's note (Prescriptions.Notes).
// status: "Draft" until the visit is completed, then "Finalized".
export const EMPTY_PRESCRIPTION_DRAFT = { items: [], notes: "", status: "Draft" };

export const MOCK_PLAN_SERVICE_TYPES = {
    2: [
        { id: "scaling-one", name: "Lấy cao răng một hàm", price: 150000 },
        { id: "scaling-full", name: "Lấy cao răng toàn hàm", price: 300000 },
    ],
    3: [
        { id: "filling-composite", name: "Trám răng composite", price: 400000 },
        { id: "filling-gic", name: "Trám răng GIC", price: 250000 },
        { id: "filling-inlay", name: "Trám inlay / onlay sứ", price: 2500000 },
    ],
    4: [
        { id: "rct-single", name: "Điều trị tủy răng một chân", price: 800000 },
        { id: "rct-multi", name: "Điều trị tủy răng nhiều chân", price: 1500000 },
    ],
    5: [
        { id: "whitening-office", name: "Tẩy trắng tại phòng khám", price: 2500000 },
        { id: "whitening-home", name: "Tẩy trắng tại nhà (máng)", price: 1500000 },
    ],
};

// Registered service that is the visit itself, so it never becomes a planned treatment.
export const GENERAL_CHECKUP_SERVICE_ID = 1;

// Step 3 draft per queue id: the registered services that need treatment (the general check-up is the visit itself).
// Patients not listed start from their registered services with one empty session each (see the service).
export const MOCK_EXAM_PLANS = {
    1: {
        code: "KH000102",
        doctorName: "BS. Trần Minh Khoa",
        services: [
            {
                id: "plan-scaling",
                serviceId: 2,
                name: "Lấy cao răng",
                status: "notStarted",
                sessions: [
                    { id: "s-1", title: "Lấy cao răng toàn hàm", typeId: "scaling-full", date: "2026-10-26", cost: 300000, note: "Lấy cao răng siêu âm, đánh bóng", status: "pending" },
                ],
            },
            {
                id: "plan-filling",
                serviceId: 3,
                name: "Trám răng",
                status: "notStarted",
                sessions: [
                    { id: "s-2", title: "Trám composite răng 36", typeId: "filling-composite", date: "2026-11-02", cost: 400000, note: "Trám mặt nhai – xa răng 36", status: "pending" },
                    { id: "s-3", title: "Trám composite răng 46", typeId: "filling-composite", date: "2026-11-09", cost: 400000, note: "Trám mặt nhai răng 46, kiểm tra khớp cắn", status: "pending" },
                ],
            },
        ],
    },
};
