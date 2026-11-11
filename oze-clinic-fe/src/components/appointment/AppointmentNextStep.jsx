import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cx } from "@/utils/cx";
import { APPOINTMENT_STATUS, CLINIC_HOTLINE, MESSAGES, QUEUE_STATUS } from "@/utils/messages";

const TONES = {
    info: { className: "alert-info", icon: Info },
    warning: { className: "alert-warning", icon: TriangleAlert },
    success: { className: "alert-success", icon: CircleCheck },
};

const joinParts = (...parts) => parts.filter(Boolean).join(" · ");

const getStep = ({ appointment, queueNumber }) => {
    const roomName = appointment.queue?.roomName;
    switch (appointment.status) {
        case APPOINTMENT_STATUS.CONFIRMED:
            return {
                tone: "info",
                title: "Vào ngày khám, vui lòng check-in tại quầy lễ tân",
                detail: `Nếu cần đổi hoặc hủy lịch, vui lòng gọi hotline ${CLINIC_HOTLINE.DISPLAY}.`,
            };
        case APPOINTMENT_STATUS.CHECKED_IN:
            return appointment.queue?.status === QUEUE_STATUS.CALLED && roomName
                ? { tone: "info", title: MESSAGES.MSG37.replace("[phòng khám]", () => roomName), detail: queueNumber && `Số thứ tự ${queueNumber}` }
                : { tone: "info", title: "Bạn đã check-in, vui lòng chờ gọi số", detail: joinParts(roomName, queueNumber && `Số thứ tự ${queueNumber}`) };
        case APPOINTMENT_STATUS.IN_SERVICE:
            return { tone: "info", title: "Bạn đang được khám", detail: joinParts(roomName, appointment.doctorName) };
        default:
            return null;
    }
};

const AppointmentNextStep = ({ appointment, queueNumber, className }) => {
    const step = getStep({ appointment, queueNumber });
    if (!step) return null;
    const tone = TONES[step.tone];
    const Icon = tone.icon;

    return (
        <div className={cx("alert border-transparent", tone.className, className)}>
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
                <p className="alert-title">{step.title}</p>
                {step.detail && <p>{step.detail}</p>}
            </div>
        </div>
    );
};

export default AppointmentNextStep;
