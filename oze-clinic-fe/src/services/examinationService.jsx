import { MOCK_EXAM_DONE_COUNT, MOCK_EXAM_QUEUE, MOCK_EXAM_RECORDS, MOCK_EXAM_SHIFT } from "../utils/data/mockExamination";
import { isQueueBusy } from "../utils/examination";
import { QUEUE_STATUS } from "../utils/messages";

// TODO(api): mock only, swap for the exam endpoints (queue, encounter, medical history) once the backend has them.
const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const state = {
    queue: MOCK_EXAM_QUEUE.map((item) => ({ ...item })),
    doneCount: MOCK_EXAM_DONE_COUNT,
    records: structuredClone(MOCK_EXAM_RECORDS),
};

const snapshot = () => ({
    shift: { ...MOCK_EXAM_SHIFT },
    queue: state.queue.map((item) => ({ ...item })),
    doneCount: state.doneCount,
});

const findItem = (id) => state.queue.find((item) => item.id === id);

// Queue of the doctor's room for the current shift.
export const getExamWorkspace = async () => {
    await wait(MOCK_DELAY_MS);
    return success(snapshot());
};

// Everything the exam screen shows about one patient in the queue.
export const getExamRecord = async (queueId) => {
    await wait(MOCK_DELAY_MS);
    const record = state.records[queueId];
    return record ? success(structuredClone(record)) : failure("Không tìm thấy hồ sơ của bệnh nhân này.");
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
    state.queue = state.queue.filter((entry) => entry.id !== queueId);
    state.doneCount += 1;
    return success(snapshot(), `Đã kết thúc lượt khám của ${item.patientName}.`);
};
