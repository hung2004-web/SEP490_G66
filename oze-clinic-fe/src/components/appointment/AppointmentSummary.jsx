import { formatDate, formatTimeRange, formatWeekday } from "@/utils/format";

const formatSlot = ({ appointmentDate, timeSlotStart, timeSlotEnd }) => {
    const day = [formatWeekday(appointmentDate), formatDate(appointmentDate)].filter(Boolean).join(" ");
    return [formatTimeRange(timeSlotStart, timeSlotEnd), day].filter(Boolean).join(", ");
};

const AppointmentSummary = ({ appointment, next = null }) => {
    const current = formatSlot(appointment);
    const nextSlot = next ? formatSlot(next) : "";

    return (
        <div className="rounded-lg bg-surface-tint p-4">
            <p className="text-title text-ink">{[appointment.appointmentCode, appointment.serviceName].filter(Boolean).join(" · ")}</p>
            {current && <p className="num text-body-sm text-muted">Hiện tại: {current}</p>}
            {nextSlot && <p className="text-body-sm text-ink">Lịch mới: {nextSlot}</p>}
        </div>
    );
};

export default AppointmentSummary;
