import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cx } from "@/utils/cx";
import { MEDICAL_RECORD_APPOINTMENT_BADGE } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const NextAppointmentBar = ({ appointment }) => {
    if (!appointment) return null;
    const details = [appointment.time || "Phòng khám chưa xác nhận giờ", appointment.doctor, appointment.method].filter(Boolean).join(" · ");
    return (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary-soft bg-primary-soft px-4 py-3">
            <span className={cx("badge", MEDICAL_RECORD_APPOINTMENT_BADGE[appointment.status] ?? "badge-neutral")}>Buổi hẹn kế tiếp</span>
            <div className="min-w-50 flex-1">
                <p className="font-semibold text-ink">
                    {appointment.wd} {appointment.date} · {appointment.service}
                </p>
                <p className="text-caption text-muted">{details}</p>
            </div>
            <Link to={ROUTES.APPOINTMENTS} className="btn btn-secondary h-8 px-3 text-caption">
                Xem lịch hẹn
                <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
        </div>
    );
};

export default NextAppointmentBar;
