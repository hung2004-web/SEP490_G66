import {
    DOCTOR_TASK_TYPES,
    MOCK_DOCTOR_QUEUE,
    MOCK_DOCTOR_SHIFT,
    MOCK_DOCTOR_TASKS,
    MOCK_DOCTOR_TODAY,
} from "../utils/data/mockDoctorDashboard";

// TODO(api): mock only, swap for the doctor's queue / review endpoints once the backend has them.
const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const queue = MOCK_DOCTOR_QUEUE.map((patient) => ({ ...patient }));
const today = { ...MOCK_DOCTOR_TODAY, inExamination: null };

const countTasks = (type) => MOCK_DOCTOR_TASKS.filter((task) => task.type === type).length;

// Everything the doctor's dashboard shows: today's shift, numbers, waiting queue and tasks to review.
export const getDoctorDashboard = async () => {
    await wait(MOCK_DELAY_MS);

    const inExamination = today.inExamination ? 1 : 0;
    return success({
        shift: { ...MOCK_DOCTOR_SHIFT },
        stats: {
            totalToday: queue.length + inExamination + today.completed,
            waiting: queue.length,
            inExamination,
            completed: today.completed,
            longestWaitMinutes: Math.max(0, ...queue.map((patient) => patient.waitedMinutes)),
            pendingImagingResults: today.pendingImagingResults,
        },
        inExamination: today.inExamination ? { ...today.inExamination } : null,
        queue: queue.map((patient) => ({ ...patient })),
        tasks: MOCK_DOCTOR_TASKS.map((task) => ({ ...task })),
    });
};

// Calls the first patient in line into the room. The one being examined before counts as done.
export const callNextPatient = async () => {
    await wait(MOCK_DELAY_MS);

    const next = queue.shift();
    if (!next) return failure("Không còn bệnh nhân nào trong hàng chờ.");

    if (today.inExamination) today.completed += 1;
    today.inExamination = next;
    return success({ ...next }, `Đã gọi số ${next.queueNumber} – ${next.patientName} vào ${MOCK_DOCTOR_SHIFT.roomName}.`);
};

// Counts for the doctor's sidebar: patients waiting, imaging results and refund requests to review.
export const getDoctorPendingCounts = async () => {
    await wait(MOCK_DELAY_MS);

    return success({
        waitingPatients: queue.length,
        pendingImagingReviews: countTasks(DOCTOR_TASK_TYPES.IMAGING_REVIEW),
        pendingRefundReviews: countTasks(DOCTOR_TASK_TYPES.REFUND_REVIEW),
    });
};
