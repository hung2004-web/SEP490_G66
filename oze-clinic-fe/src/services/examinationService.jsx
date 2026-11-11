import {
    EMPTY_EXAM_DRAFT,
    EMPTY_PRESCRIPTION_DRAFT,
    EMPTY_TREATMENT_DRAFT,
    GENERAL_CHECKUP_SERVICE_ID,
    MOCK_EXAM_DONE_COUNT,
    MOCK_EXAM_DRAFTS,
    MOCK_EXAM_PLANS,
    MOCK_EXAM_QUEUE,
    MOCK_EXAM_RECORDS,
    MOCK_EXAM_SHIFT,
} from "../utils/data/mockExamination";
import { isQueueBusy, newPlanSession } from "../utils/examination";
import { QUEUE_STATUS } from "../utils/messages";

// TODO(api): mock only, swap for the exam endpoints (queue, encounter, medical history) once the backend has them.
const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

// TODO(api): the plan's doctor comes from the encounter.
const MOCK_DOCTOR_NAME = "BS. Trần Minh Khoa";

// Plan to fill in from the registered treatments: one empty session per service.
function planFromServices(id, services) {
    return {
        code: `KH${String(100 + Number(id)).padStart(6, "0")}`,
        doctorName: MOCK_DOCTOR_NAME,
        services: services
            .filter((service) => service.id !== GENERAL_CHECKUP_SERVICE_ID)
            .map((service) => ({
                id: `plan-${service.id}`,
                serviceId: service.id,
                name: service.name,
                status: "notStarted",
                sessions: [newPlanSession(`session-${service.id}-1`)],
            })),
    };
}

const state = {
    queue: MOCK_EXAM_QUEUE.map((item) => ({ ...item })),
    doneCount: MOCK_EXAM_DONE_COUNT,
    records: Object.fromEntries(
        Object.entries(MOCK_EXAM_RECORDS).map(([id, record]) => [
            id,
            {
                ...structuredClone(record),
                exam: structuredClone(MOCK_EXAM_DRAFTS[id] ?? EMPTY_EXAM_DRAFT),
                plan: structuredClone(MOCK_EXAM_PLANS[id] ?? planFromServices(id, record.services)),
                treatment: structuredClone(EMPTY_TREATMENT_DRAFT),
                prescription: structuredClone(EMPTY_PRESCRIPTION_DRAFT),
            },
        ]),
    ),
    nextFilmNumber: 331,
};

const pad2 = (value) => String(value).padStart(2, "0");

const clockNow = () => {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
};

const snapshot = () => ({
    shift: { ...MOCK_EXAM_SHIFT },
    queue: state.queue.map((item) => ({ ...item })),
    doneCount: state.doneCount,
});

const findItem = (id) => state.queue.find((item) => item.id === id);

// Step indexes of "Điều trị" and "Kê đơn thuốc" (see EXAM_STEPS).
const TREATMENT_STEP = 3;
const PRESCRIPTION_STEP = 4;

// Marks today's plan session done once something was treated; its service becomes in progress, or done with its last session.
const completeSession = (record) => {
    const { sessionId, items } = record.treatment;
    if (!sessionId || !items.length) return;
    const service = record.plan.services.find((entry) => entry.sessions.some((session) => session.id === sessionId));
    if (!service) return;
    service.sessions = service.sessions.map((session) => (session.id === sessionId ? { ...session, status: "done" } : session));
    service.status = service.sessions.every((session) => session.status === "done") ? "done" : "inProgress";
};

// Queue of the doctor's room for the current shift.
export const getExamWorkspace = async () => {
    await wait(MOCK_DELAY_MS);
    return success(snapshot());
};

// Everything the exam screen shows about one patient in the queue, including the step 2 draft (record.exam)
// and the step 3 treatment plan draft (record.plan).
export const getExamRecord = async (queueId) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    return record ? success(structuredClone(record)) : failure("Không tìm thấy hồ sơ của bệnh nhân này.");
};

// One previous visit of a patient: diagnoses, work done, treatment plan with its progress, prescription.
export const getVisitDetail = async (queueId, visitId) => {
    await wait(MOCK_DELAY_MS);
    const visit = state.records[queueId]?.visits.find((item) => item.id === visitId);
    if (!visit?.detail) return failure("Không tìm thấy chi tiết lần khám này.");
    const { detail, ...summary } = visit;
    return success(structuredClone({ ...summary, ...detail }));
};

export const callPatient = async (queueId) => {
    await wait(MOCK_DELAY_MS);
    const item = findItem(queueId);
    if (!item || item.status !== QUEUE_STATUS.WAITING) return failure("Bệnh nhân không còn trong hàng chờ.");
    if (isQueueBusy(state.queue)) return failure("Đang có bệnh nhân trong phòng. Kết thúc lượt khám trước khi gọi người tiếp theo.");
    item.status = QUEUE_STATUS.CALLED;
    return success(snapshot(), `Đã gọi số ${item.queueNumber} · ${item.patientName} vào phòng khám.`);
};

export const markAbsent = async (queueId) => {
    await wait(MOCK_DELAY_MS);
    const item = findItem(queueId);
    if (!item || item.status !== QUEUE_STATUS.CALLED) return failure("Chỉ báo vắng mặt được bệnh nhân đã gọi.");
    state.queue = state.queue.filter((entry) => entry.id !== queueId);
    return success(snapshot(), `Đã báo vắng mặt số ${item.queueNumber} · ${item.patientName}.`);
};

export const startExamination = async (queueId) => {
    await wait(MOCK_DELAY_MS);
    const item = findItem(queueId);
    if (!item || item.status !== QUEUE_STATUS.CALLED) return failure("Chỉ bắt đầu khám được bệnh nhân đã gọi vào phòng.");
    item.status = QUEUE_STATUS.IN_EXAMINATION;
    item.startedAt = Date.now();
    item.step = 0;
    return success(snapshot(), `Bắt đầu khám ${item.patientName}.`);
};

// Moves the visit to another step (0-based, see EXAM_STEPS).
export const setExamStep = async (queueId, step) => {
    await wait(MOCK_DELAY_MS);
    const item = findItem(queueId);
    if (!item || item.status !== QUEUE_STATUS.IN_EXAMINATION) return failure("Lượt khám này không còn mở.");
    item.step = Math.max(item.step ?? 0, step);
    return success(snapshot());
};

// Draft save of step 1. history: { allergies, conditions, dental }.
export const saveMedicalHistory = async (queueId, history) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    if (!record) return failure("Không tìm thấy hồ sơ của bệnh nhân này.");
    record.history = structuredClone(history);
    return success({ savedAt: Date.now() });
};

export const endExamination = async (queueId) => {
    await wait(MOCK_DELAY_MS);
    const item = findItem(queueId);
    if (!item || item.status !== QUEUE_STATUS.IN_EXAMINATION) return failure("Lượt khám này không còn mở.");
    const record = state.records[queueId];
    if ((item.step ?? 0) >= TREATMENT_STEP) completeSession(record);
    // Completing the visit finalizes the prescription (F-EXM-06 "chốt đơn"); an empty one is dropped.
    if ((item.step ?? 0) >= PRESCRIPTION_STEP && record?.prescription.items.length) record.prescription.status = "Finalized";
    state.queue = state.queue.filter((entry) => entry.id !== queueId);
    state.doneCount += 1;
    return success(snapshot(), `Đã kết thúc lượt khám của ${item.patientName}.`);
};

// Draft save of step 2. exam: { symptoms, note, entries, films, diagnoses }.
export const saveExamDraft = async (queueId, exam) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    if (!record) return failure("Không tìm thấy hồ sơ của bệnh nhân này.");
    record.exam = structuredClone(exam);
    return success({ savedAt: Date.now() });
};

// Sends an X-ray order to the imaging technician: one request per selected type.
// request: { types: [], area, purpose, needPrint }. Returns the new films.
export const requestXray = async (queueId, request) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    if (!record) return failure("Không tìm thấy hồ sơ của bệnh nhân này.");
    if (!request.types?.length || !request.area?.trim()) return failure("Chọn loại chụp và nhập vùng / răng cần chụp.");
    const sentAt = clockNow();
    const films = request.types.map((type) => {
        const number = state.nextFilmNumber++;
        return {
            id: `film-${number}`,
            code: `YC${String(number).padStart(6, "0")}`,
            type,
            area: request.area.trim(),
            purpose: request.purpose?.trim() ?? "",
            needPrint: Boolean(request.needPrint),
            status: "requested",
            sentAt,
        };
    });
    record.exam.films = [...films, ...record.exam.films];
    return success(structuredClone(films), `Đã gửi ${films.length} yêu cầu chụp tới kỹ thuật viên.`);
};

// Draft save of step 3. plan: { services: [...] } (see utils/examination).
export const saveTreatmentPlan = async (queueId, plan) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    if (!record) return failure("Không tìm thấy hồ sơ của bệnh nhân này.");
    record.plan = structuredClone(plan);
    return success({ savedAt: Date.now() });
};

// Draft save of step 4. treatment: see EMPTY_TREATMENT_DRAFT.
export const saveTreatmentDraft = async (queueId, treatment) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    if (!record) return failure("Không tìm thấy hồ sơ của bệnh nhân này.");
    record.treatment = structuredClone(treatment);
    return success({ savedAt: Date.now() });
};

// Leaving step 4 for the prescription: saves the draft and marks today's session done. Returns the updated plan.
export const completeTreatmentSession = async (queueId, treatment) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    if (!record) return failure("Không tìm thấy hồ sơ của bệnh nhân này.");
    if (!treatment.items.length) return failure("Thêm ít nhất một nội dung điều trị.");
    record.treatment = structuredClone(treatment);
    completeSession(record);
    return success(structuredClone(record.plan));
};

// Draft save of step 5. prescription: see EMPTY_PRESCRIPTION_DRAFT.
export const savePrescriptionDraft = async (queueId, prescription) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    if (!record) return failure("Không tìm thấy hồ sơ của bệnh nhân này.");
    if (record.prescription.status === "Finalized") return failure("Đơn thuốc đã được chốt, không sửa được nữa.");
    record.prescription = structuredClone(prescription);
    return success({ savedAt: Date.now() });
};
