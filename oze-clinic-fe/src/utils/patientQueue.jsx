import { APPOINTMENT_STATUS, QUEUE_STATUS } from "./messages";

export const QUEUE_IN_PROGRESS = "IN_PROGRESS";

export const PATIENT_QUEUE_STATE = {
    IN_SERVICE: "inservice",
    NO_QUEUE: "noqueue",
    IMAGING: "imaging",
    CALLED: "called",
    RETURNED: "returned",
    DESK: "desk",
    SKIPPED: "skipped",
    WAITING: "waiting",
};

const IN_CLINIC_STATUSES = [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_SERVICE];

const IN_SERVICE_QUEUE_STATUSES = [QUEUE_IN_PROGRESS, QUEUE_STATUS.IN_EXAMINATION];

export const isInClinic = (appointment) => IN_CLINIC_STATUSES.includes(appointment?.status);

export const isQueueInService = (status) => IN_SERVICE_QUEUE_STATUSES.includes(status);

export const formatQueueNumber = (value) => (Number.isInteger(value) && value > 0 ? String(value).padStart(2, "0") : null);

export const getPatientQueueState = (appointment) => {
    if (!isInClinic(appointment)) return null;
    const queue = appointment.queue;
    if (appointment.status === APPOINTMENT_STATUS.IN_SERVICE || isQueueInService(queue?.status)) return PATIENT_QUEUE_STATE.IN_SERVICE;
    if (formatQueueNumber(queue?.queueNumber) === null) return PATIENT_QUEUE_STATE.NO_QUEUE;
    if (queue.imaging != null) return PATIENT_QUEUE_STATE.IMAGING;
    if (queue.status === QUEUE_STATUS.CALLED) return PATIENT_QUEUE_STATE.CALLED;
    if (queue.hasExamination) return PATIENT_QUEUE_STATE.RETURNED;
    if (queue.doctorShiftEnded) return PATIENT_QUEUE_STATE.DESK;
    if (queue.skipCount > 0) return PATIENT_QUEUE_STATE.SKIPPED;
    return PATIENT_QUEUE_STATE.WAITING;
};

export const getPeopleAheadText = (peopleAhead) => {
    if (!Number.isInteger(peopleAhead) || peopleAhead < 0) return null;
    if (peopleAhead === 0) return "Không còn ai";
    if (peopleAhead === 1) return "1 người";
    return `Khoảng ${peopleAhead} người`;
};
