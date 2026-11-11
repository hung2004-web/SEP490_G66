import { formatTime, getClinicToday } from "./format";
import { APPOINTMENT_STATUS, CLINIC_HOTLINE, MESSAGES, QUEUE_STATUS } from "./messages";

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

export const PATIENT_QUEUE_BADGE = {
    [PATIENT_QUEUE_STATE.WAITING]: { label: "Đang chờ gọi số", badge: "badge-neutral" },
    [PATIENT_QUEUE_STATE.CALLED]: { label: "Đang gọi số của bạn", badge: "badge-success" },
    [PATIENT_QUEUE_STATE.SKIPPED]: { label: "Chờ gọi lại", badge: "badge-warning" },
    [PATIENT_QUEUE_STATE.RETURNED]: { label: "Chờ gọi lại sau chụp phim", badge: "badge-info" },
    [PATIENT_QUEUE_STATE.DESK]: { label: "Mời đến quầy lễ tân", badge: "badge-warning" },
    [PATIENT_QUEUE_STATE.IN_SERVICE]: { label: "Đang khám", badge: "badge-info" },
};

export const IMAGING_QUEUE_BADGE = {
    [QUEUE_STATUS.WAITING]: { label: "Đang chờ chụp phim", badge: "badge-info" },
    [QUEUE_STATUS.CALLED]: { label: "Đến lượt chụp phim", badge: "badge-success" },
};

const IN_CLINIC_STATUSES = [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_SERVICE];

const IN_SERVICE_QUEUE_STATUSES = [QUEUE_IN_PROGRESS, QUEUE_STATUS.IN_EXAMINATION];

const BACK_TO_WAITING = "Chụp xong, quay lại khu vực chờ khám – bạn sẽ được ưu tiên gọi lại.";

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

export const getReassignText = (appointment) => {
    const queue = appointment?.queue;
    const from = formatQueueNumber(queue?.previousQueueNumber);
    const to = formatQueueNumber(queue?.queueNumber);
    if (!from || !to || !queue.previousDoctorName || !appointment.doctorName) return null;
    return `Số thứ tự đã đổi từ ${from} sang ${to} vì bạn được chuyển từ ${queue.previousDoctorName} sang ${appointment.doctorName}.`;
};

const getImagingGuide = (imaging) => {
    const room = imaging.roomName;
    if (imaging.status === QUEUE_STATUS.CALLED) {
        return {
            tone: "success",
            title: room ? `Đến lượt chụp phim, mời vào ${room}` : "Đến lượt chụp phim, mời đến quầy lễ tân để được chỉ phòng",
            detail: "Vui lòng đi ngay.",
        };
    }
    return {
        tone: "info",
        title: room ? `Mời bạn sang ${room}` : "Mời bạn đến khu chụp phim",
        detail: room ? BACK_TO_WAITING : `Lễ tân sẽ chỉ phòng khi gọi số chụp phim. ${BACK_TO_WAITING}`,
    };
};

const getWaitingDetail = (queue) => {
    const shiftStart = formatTime(queue.shiftStart);
    return queue.peopleAhead === 0 && queue.doctorOnShift === false && shiftStart
        ? `Bác sĩ vào ca lúc ${shiftStart}. Bạn sẽ được gọi sau khi bác sĩ bắt đầu khám.`
        : "Khi đến lượt, số của bạn sẽ hiện trên màn hình ở sảnh.";
};

const getQueueGuide = (appointment, state) => {
    const queue = appointment.queue;
    const room = queue?.roomName;
    switch (state) {
        case PATIENT_QUEUE_STATE.IN_SERVICE: {
            const place = [room, appointment.doctorName].filter(Boolean).join(" · ");
            const note = "Phiếu khám sẽ có trong Sổ khám bệnh sau buổi khám.";
            return { tone: "info", title: "Bạn đang được khám", detail: place ? `${place}. ${note}` : note };
        }
        case PATIENT_QUEUE_STATE.NO_QUEUE:
            return { tone: "warning", title: "Bạn đã báo có mặt nhưng chưa có số thứ tự", detail: "Vui lòng hỏi lễ tân tại quầy." };
        case PATIENT_QUEUE_STATE.IMAGING:
            return getImagingGuide(queue.imaging);
        case PATIENT_QUEUE_STATE.CALLED:
            return {
                tone: "success",
                title: room ? MESSAGES.MSG37.replace("[phòng khám]", () => room) : "Đến lượt bạn, mời đến quầy lễ tân để được chỉ phòng",
                detail: "Vui lòng đi ngay. Nếu không có mặt khi được gọi, số của bạn sẽ lùi về sau.",
            };
        case PATIENT_QUEUE_STATE.RETURNED:
            return { tone: "info", title: "Đã chụp phim xong", detail: "Bác sĩ đang xem phim. Bạn được ưu tiên gọi lại khám, vui lòng ngồi gần khu vực chờ." };
        case PATIENT_QUEUE_STATE.DESK:
            return {
                tone: "warning",
                title: "Bác sĩ của bạn đã kết thúc ca",
                detail: "Vui lòng đến quầy lễ tân để được chuyển sang bác sĩ khác. Bạn không cần đặt lịch lại.",
            };
        case PATIENT_QUEUE_STATE.SKIPPED:
            return {
                tone: "warning",
                title: `Số ${formatQueueNumber(queue.queueNumber)} đã được gọi khi bạn vắng mặt`,
                detail: "Số của bạn đã lùi về sau. Vui lòng ngồi gần khu vực chờ – bạn sẽ được gọi lại, không cần báo lễ tân.",
            };
        default:
            return {
                tone: getReassignText(appointment) ? "warning" : "info",
                title: room ? `Mời bạn ngồi chờ ở khu vực trước ${room}` : "Mời bạn ngồi chờ ở sảnh",
                detail: getWaitingDetail(queue),
            };
    }
};

const getConfirmedGuide = (appointment) => {
    const start = formatTime(appointment.timeSlotStart);
    if (String(appointment.appointmentDate ?? "").slice(0, 10) === getClinicToday() && start) {
        return { tone: "info", title: `Hôm nay bạn có lịch lúc ${start}`, detail: "Đến quầy lễ tân báo có mặt để nhận số thứ tự và phòng chờ." };
    }
    return {
        tone: "info",
        title: "Vào ngày khám, vui lòng đến quầy lễ tân báo có mặt",
        detail: `Nếu cần đổi hoặc hủy lịch, vui lòng gọi hotline ${CLINIC_HOTLINE.DISPLAY}.`,
    };
};

export const getAppointmentGuide = (appointment) => {
    const state = getPatientQueueState(appointment);
    if (state) return getQueueGuide(appointment, state);
    if (appointment?.status === APPOINTMENT_STATUS.CONFIRMED) return getConfirmedGuide(appointment);
    return null;
};

export const getQueueAnnouncementKey = (appointment) => {
    const state = getPatientQueueState(appointment);
    if (!state) return "";
    const queue = appointment.queue;
    return [state, formatQueueNumber(queue?.queueNumber), queue?.roomName, queue?.imaging?.status, queue?.imaging?.roomName].join("|");
};

export const getQueueAnnouncement = (appointment, previousKey) => {
    const guide = getAppointmentGuide(appointment);
    if (!guide) return "";
    const previousNumber = previousKey.split("|")[1];
    const number = formatQueueNumber(appointment.queue?.queueNumber);
    const changed = getReassignText(appointment) && number && previousNumber !== number ? `Số thứ tự đã đổi sang ${number}. ` : "";
    return `${changed}${guide.title}.`;
};
