import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardSection from "@/components/dashboard/DashboardSection";
import DetailLink from "@/components/ui/DetailLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatTimeRange } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE, PATIENT_APPOINTMENT_STATUS } from "@/utils/messages";
import { ROUTES, getAppointmentDetailRoute } from "@/utils/routes";
import NextVisitCard from "./NextVisitCard";

const TITLE_ID = "patient-dashboard-upcoming";

const getDetailContext = (appointment) => {
    const date = formatDate(appointment.appointmentDate);
    return date && `lịch hẹn ngày ${date}`;
};

const UpcomingAppointmentsSection = ({ highlighted = null, highlightedIsToday = false, nextAppointments = [], loading = false, failed = false }) => {
    const loaded = !loading && !failed;

    return (
        <DashboardSection
            id={TITLE_ID}
            title="Lịch hẹn sắp tới"
            busy={loading}
            link={loaded && highlighted && { to: ROUTES.APPOINTMENTS, label: "Xem tất cả lịch hẹn" }}
            error={!loading && failed && GENERIC_ERROR_MESSAGE}
            empty={
                loaded &&
                !highlighted && {
                    icon: CalendarDays,
                    text: "Bạn chưa có lịch hẹn sắp tới.",
                    action: (
                        <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-secondary min-h-11 md:min-h-0">
                            Đặt lịch hẹn
                        </Link>
                    ),
                }
            }
        >
            {loading && (
                <div aria-hidden="true" className="flex flex-col gap-4">
                    <div className="skeleton h-32" />
                    <div className="skeleton h-12" />
                    <div className="skeleton h-12" />
                </div>
            )}
            {loaded && highlighted && <NextVisitCard appointment={highlighted} isToday={highlightedIsToday} />}
            {loaded && highlighted && nextAppointments.length > 0 && (
                <>
                    <div className="table-wrap hidden md:block">
                        <table className="table" aria-labelledby={TITLE_ID}>
                            <thead>
                                <tr>
                                    <th scope="col">Ngày</th>
                                    <th scope="col">Giờ</th>
                                    <th scope="col">Dịch vụ</th>
                                    <th scope="col">Bác sĩ</th>
                                    <th scope="col">Trạng thái</th>
                                    <th scope="col">
                                        <span className="sr-only">Xem chi tiết</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {nextAppointments.map((appointment) => (
                                    <tr key={appointment.id}>
                                        <td>{formatDate(appointment.appointmentDate)}</td>
                                        <td>{formatTimeRange(appointment.timeSlotStart, appointment.timeSlotEnd)}</td>
                                        <td className="cell-primary">{appointment.serviceName}</td>
                                        <td>{appointment.doctorName}</td>
                                        <td>
                                            <StatusBadge status={appointment.status} labels={PATIENT_APPOINTMENT_STATUS} />
                                        </td>
                                        <td className="text-right">
                                            <DetailLink to={getAppointmentDetailRoute(appointment.id)} context={getDetailContext(appointment)}>
                                                Xem chi tiết
                                            </DetailLink>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ul className="divide-y divide-border rounded-lg border border-border md:hidden">
                        {nextAppointments.map((appointment) => (
                            <li key={appointment.id} className="flex flex-col items-start gap-1 px-4 py-3">
                                <p className="num text-title text-ink">
                                    {[formatDate(appointment.appointmentDate), formatTimeRange(appointment.timeSlotStart, appointment.timeSlotEnd)]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                                <p className="text-body-sm text-ink">{appointment.serviceName}</p>
                                <p className="text-caption text-muted">{appointment.doctorName}</p>
                                <StatusBadge status={appointment.status} labels={PATIENT_APPOINTMENT_STATUS} />
                                <DetailLink to={getAppointmentDetailRoute(appointment.id)} context={getDetailContext(appointment)} className="min-h-11">
                                    Xem chi tiết
                                </DetailLink>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </DashboardSection>
    );
};

export default UpcomingAppointmentsSection;
