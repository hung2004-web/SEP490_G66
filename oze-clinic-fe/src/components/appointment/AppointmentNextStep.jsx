import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cx } from "@/utils/cx";
import { formatTime, getClinicToday } from "@/utils/format";
import { APPOINTMENT_STATUS, CLINIC_HOTLINE, MESSAGES, QUEUE_STATUS } from "@/utils/messages";
import { PATIENT_QUEUE_STATE, formatQueueNumber, getPatientQueueState } from "@/utils/patientQueue";

const TONES = {
    info: { className: "alert-info", icon: Info },
    warning: { className: "alert-warning", icon: TriangleAlert },
    success: { className: "alert-success", icon: CircleCheck },
};

const BACK_TO_WAITING = "Chụp xong, quay lại khu vực chờ khám – bạn sẽ được ưu tiên gọi lại.";

const getImagingStep = (imaging) => {
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

const getQueueStep = (appointment, state) => {
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
            return getImagingStep(queue.imaging);
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

const getReassignText =(appointment) => {
    const queue = appointment.queue;
    const from = formatQueueNumber(queue?.previousQueueNumber);
    const to = formatQueueNumber(queue?.queueNumber);
    if (!from || !to || !queue.previousDoctorName || !appointment.doctorName) return null;
    return `Số thứ tự đã đổi từ ${from} sang ${to} vì bạn được chuyển từ ${queue.previousDoctorName} sang ${appointment.doctorName}.`;
};

const getConfirmedStep = (appointment) => {
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

const getStep = (appointment) => {
    const state = getPatientQueueState(appointment);
    if (state) return getQueueStep(appointment, state);
    if (appointment.status === APPOINTMENT_STATUS.CONFIRMED) return getConfirmedStep(appointment);
    return null;
};

const AppointmentNextStep = ({ appointment, refreshError = false, updatedAt, className }) => {
    const step = getStep(appointment);
    if (!step) return null;
    const tone = TONES[step.tone];
    const Icon = tone.icon;
    const reassignText = getPatientQueueState(appointment) ? getReassignText(appointment) : null;
    const showRefreshError = refreshError && updatedAt && formatQueueNumber(appointment.queue?.queueNumber);

    return (
        <div className={cx("alert border-transparent", tone.className, className)}>
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
                <p className="alert-title">{step.title}</p>
                <p>{step.detail}</p>
                {reassignText && <p className="num mt-2">{reassignText}</p>}
                {showRefreshError && <p className="num mt-2">{`Thông tin lúc ${updatedAt}, có thể đã thay đổi. Bấm Cập nhật hoặc hỏi lễ tân.`}</p>}
            </div>
        </div>
    );
};

export default AppointmentNextStep;
