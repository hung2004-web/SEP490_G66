import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cx } from "@/utils/cx";
import { formatQueueNumber, getAppointmentGuide, getReassignText, isInClinic } from "@/utils/patientQueue";

const TONES = {
    info: { className: "alert-info", icon: Info },
    warning: { className: "alert-warning", icon: TriangleAlert },
    success: { className: "alert-success", icon: CircleCheck },
};

const AppointmentNextStep = ({ appointment, refreshError = false, updatedAt, className }) => {
    const guide = getAppointmentGuide(appointment);
    if (!guide) return null;
    const tone = TONES[guide.tone];
    const Icon = tone.icon;
    const reassignText = isInClinic(appointment) ? getReassignText(appointment) : null;
    const showRefreshError = refreshError && updatedAt && formatQueueNumber(appointment.queue?.queueNumber);

    return (
        <div className={cx("alert border-transparent", tone.className, className)}>
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
                <p className="alert-title">{guide.title}</p>
                <p>{guide.detail}</p>
                {reassignText && <p className="num mt-2">{reassignText}</p>}
                {showRefreshError && <p className="num mt-2">{`Thông tin lúc ${updatedAt}, có thể đã thay đổi. Bấm Cập nhật hoặc hỏi lễ tân.`}</p>}
            </div>
        </div>
    );
};

export default AppointmentNextStep;
