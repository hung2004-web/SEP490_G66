import { CircleAlert, CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { cx } from "@/utils/cx";
import { APPOINTMENT_STATUS, CLINIC_HOTLINE, MESSAGES, QUEUE_STATUS } from "@/utils/messages";

const TONES = {
    info: { className: "alert-info", icon: Info },
    warning: { className: "alert-warning", icon: TriangleAlert },
    success: { className: "alert-success", icon: CircleCheck },
    danger: { className: "alert-danger", icon: CircleAlert },
    neutral: { className: "bg-neutral-soft text-neutral", icon: CircleX },
};

const joinParts = (...parts) => parts.filter(Boolean).join(" · ");

const getStep = ({ appointment, changeAllowed, hasResult, queueNumber }) => {
    const roomName = appointment.queue?.roomName;
    switch (appointment.status) {
        case APPOINTMENT_STATUS.PENDING:
            return changeAllowed
                ? { tone: "warning", title: "Phòng khám đang xem xét lịch hẹn của bạn", detail: "Bạn sẽ nhận thông báo khi lịch được xác nhận." }
                : { tone: "warning", title: "Đã quá hạn đổi/hủy trực tuyến", detail: `Vui lòng gọi hotline ${CLINIC_HOTLINE.DISPLAY} để được hỗ trợ.`, callLink: true };
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
        case APPOINTMENT_STATUS.COMPLETED:
            return {
                tone: "success",
                title: "Lần khám đã hoàn tất",
                detail: hasResult ? "Xem kết quả, hóa đơn và lịch tái khám bên dưới." : "Kết quả sẽ hiển thị sau khi bác sĩ hoàn tất bệnh án.",
            };
        case APPOINTMENT_STATUS.CANCELLED:
            return { tone: "neutral", title: "Lịch hẹn đã được hủy", detail: "Lịch đã hủy vẫn được lưu trong lịch sử khám." };
        case APPOINTMENT_STATUS.NO_SHOW:
            return { tone: "danger", title: "Bạn đã không đến khám theo lịch này", detail: `Nếu cần, hãy đặt lịch mới hoặc gọi hotline ${CLINIC_HOTLINE.DISPLAY}.` };
        default:
            return null;
    }
};

const AppointmentNextStep = ({ appointment, changeAllowed, hasResult, queueNumber, className }) => {
    const step = getStep({ appointment, changeAllowed, hasResult, queueNumber });
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
            {step.callLink && (
                <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="btn btn-link ml-auto">
                    Gọi ngay
                </a>
            )}
        </div>
    );
};

export default AppointmentNextStep;
