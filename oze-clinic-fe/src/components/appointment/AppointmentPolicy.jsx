import { Info } from "lucide-react";
import DashboardSection from "@/components/dashboard/DashboardSection";
import { getChangeDeadline } from "@/services/patientDashboardService";
import { formatDateTime } from "@/utils/format";
import { APPOINTMENT_CHANGE_DEADLINE_HOURS, APPOINTMENT_STATUS } from "@/utils/messages";

const PENDING_RULES = [
    `Đổi hoặc hủy lịch trực tuyến trước giờ hẹn ít nhất ${APPOINTMENT_CHANGE_DEADLINE_HOURS} giờ.`,
    "Sau thời hạn trên, vui lòng gọi hotline để được hỗ trợ.",
    "Lịch đã hủy vẫn được lưu trong lịch sử khám.",
];

const CONFIRMED_RULES = ["Lịch đã được phòng khám xác nhận chỉ đổi hoặc hủy được qua hotline.", "Lịch đã hủy vẫn được lưu trong lịch sử khám."];

const getDeadlineText = (appointment, now) => {
    const deadline = getChangeDeadline(appointment);
    if (!deadline) return "—";
    return now < deadline ? formatDateTime(deadline) : "Đã quá hạn";
};

const AppointmentPolicy = ({ appointment, now }) => {
    const pending = appointment.status === APPOINTMENT_STATUS.PENDING;
    const rules = pending ? PENDING_RULES : CONFIRMED_RULES;

    return (
        <DashboardSection id="appointment-policy" title="Chính sách đổi / hủy lịch">
            <div>
                <ul className="flex flex-col gap-3">
                    {rules.map((rule) => (
                        <li key={rule} className="flex gap-2 text-body-sm text-body">
                            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span>{rule}</span>
                        </li>
                    ))}
                </ul>
                {pending && (
                    <div className="mt-4 rounded-lg bg-warning-soft p-4">
                        <p className="text-caption text-warning">Hạn đổi / hủy trực tuyến</p>
                        <p className="num text-title text-ink">{getDeadlineText(appointment, now)}</p>
                    </div>
                )}
            </div>
        </DashboardSection>
    );
};

export default AppointmentPolicy;
