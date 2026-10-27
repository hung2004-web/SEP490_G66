import { Link } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatMonthShort, formatTimeRange, formatWeekday, parseDateOnly } from "@/utils/format";
import { APPOINTMENT_STATUS, MESSAGES, PATIENT_APPOINTMENT_STATUS, QUEUE_STATUS } from "@/utils/messages";
import { getAppointmentDetailRoute } from "@/utils/routes";

const padQueueNumber = (value) => String(value).padStart(2, "0");

const getPeopleAheadText = (peopleAhead) => {
    if (peopleAhead === 0) return "Bạn là người tiếp theo";
    if (peopleAhead > 0) return `Còn ${peopleAhead} người phía trước`;
    return null;
};

const QueueTicket = ({ queue }) => {
    if (queue?.status === QUEUE_STATUS.WAITING && queue.queueNumber != null) {
        const peopleAheadText = getPeopleAheadText(queue.peopleAhead);
        return (
            <div className="flex shrink-0 flex-col items-center rounded-md border border-border bg-canvas px-6 py-3 text-center">
                <p className="text-caption text-muted">Số thứ tự</p>
                <p className="num font-heading text-stat text-ink">{padQueueNumber(queue.queueNumber)}</p>
                {queue.roomName && <p className="text-body-sm text-ink">{queue.roomName}</p>}
                {peopleAheadText && <p className="mt-1 text-caption text-muted">{peopleAheadText}</p>}
            </div>
        );
    }

    if (queue?.status === QUEUE_STATUS.CALLED && queue.roomName) {
        return (
            <div className="alert alert-info shrink-0">
                <p className="font-heading text-heading-3">{MESSAGES.MSG37.replace("[phòng khám]", () => queue.roomName)}</p>
            </div>
        );
    }

    return null;
};

const NextVisitCard = ({ appointment, isToday = false }) => {
    const date = formatDate(appointment.appointmentDate);
    const details = [
        formatTimeRange(appointment.timeSlotStart, appointment.timeSlotEnd),
        appointment.doctorName,
        appointment.appointmentCode && `Mã lịch: ${appointment.appointmentCode}`,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-primary-softer p-4 md:flex-row md:items-center md:p-6">
            <div className="flex min-w-0 flex-1 items-start gap-4">
                <div aria-hidden="true" className="flex w-20 shrink-0 flex-col items-center rounded-md border border-border bg-canvas py-2">
                    <span className="text-caption text-muted">{formatMonthShort(appointment.appointmentDate)}</span>
                    <span className="num font-heading text-stat text-ink">{parseDateOnly(appointment.appointmentDate)?.getDate()}</span>
                    <span className="text-caption text-muted">{isToday ? "Hôm nay" : formatWeekday(appointment.appointmentDate)}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="card-title">
                            {appointment.serviceName}
                            {date && <span className="sr-only"> {date}</span>}
                        </h3>
                        <StatusBadge status={appointment.status} labels={PATIENT_APPOINTMENT_STATUS} />
                    </div>
                    {details && <p className="num mt-1 text-body-sm text-body">{details}</p>}
                </div>
            </div>
            {appointment.status === APPOINTMENT_STATUS.CHECKED_IN && <QueueTicket queue={appointment.queue} />}
            <Link to={getAppointmentDetailRoute(appointment.id)} className="btn btn-secondary min-h-11 w-full shrink-0 md:min-h-0 md:w-auto">
                Xem chi tiết
                {date && <span className="sr-only"> lịch hẹn ngày {date}</span>}
            </Link>
        </div>
    );
};

export default NextVisitCard;
