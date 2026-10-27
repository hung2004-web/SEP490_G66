import DetailLink from "@/components/ui/DetailLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatTimeRange } from "@/utils/format";
import { APPOINTMENT_STATUS, PATIENT_APPOINTMENT_STATUS } from "@/utils/messages";
import { getAppointmentDetailRoute } from "@/utils/routes";

const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 7;

const padQueueNumber = (value) => String(value).padStart(2, "0");

const getLinkContext = (appointment) => {
    if (appointment.appointmentCode) return `lịch hẹn ${appointment.appointmentCode}`;
    const date = formatDate(appointment.appointmentDate);
    return date ? `lịch hẹn ngày ${date}` : null;
};

const getDateTimeLine = (appointment) =>
    [formatDate(appointment.appointmentDate), formatTimeRange(appointment.timeSlotStart, appointment.timeSlotEnd)].filter(Boolean).join(" · ");

const AppointmentStatus = ({ appointment }) => (
    <div className="flex flex-col items-start">
        <StatusBadge status={appointment.status} labels={PATIENT_APPOINTMENT_STATUS} />
        {appointment.status === APPOINTMENT_STATUS.CHECKED_IN && appointment.queue?.queueNumber != null && (
            <p className="num mt-1 text-caption text-muted">Số thứ tự {padQueueNumber(appointment.queue.queueNumber)}</p>
        )}
    </div>
);

const AppointmentTable = ({ appointments = [], labelledBy, loading = false }) => (
    <>
        <div className="table-wrap hidden md:block">
            <table className="table" aria-labelledby={labelledBy} aria-busy={loading || undefined}>
                <thead>
                    <tr>
                        <th scope="col">Mã lịch</th>
                        <th scope="col">Ngày khám</th>
                        <th scope="col">Giờ khám</th>
                        <th scope="col">Dịch vụ</th>
                        <th scope="col">Bác sĩ</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">
                            <span className="sr-only">Xem chi tiết</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {loading
                        ? Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                              <tr key={index} aria-hidden="true">
                                  {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                                      <td key={cell}>
                                          <div className="skeleton h-4 w-full max-w-32" />
                                      </td>
                                  ))}
                              </tr>
                          ))
                        : appointments.map((appointment) => (
                              <tr key={appointment.id}>
                                  <td className="cell-primary">{appointment.appointmentCode}</td>
                                  <td>{formatDate(appointment.appointmentDate)}</td>
                                  <td>{formatTimeRange(appointment.timeSlotStart, appointment.timeSlotEnd)}</td>
                                  <td>{appointment.serviceName}</td>
                                  <td>{appointment.doctorName}</td>
                                  <td>
                                      <AppointmentStatus appointment={appointment} />
                                  </td>
                                  <td className="text-right">
                                      <DetailLink to={getAppointmentDetailRoute(appointment.id)} context={getLinkContext(appointment)}>
                                          Xem chi tiết
                                      </DetailLink>
                                  </td>
                              </tr>
                          ))}
                </tbody>
            </table>
        </div>
        {loading ? (
            <div aria-hidden="true" className="flex flex-col gap-3 md:hidden">
                {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                    <div key={index} className="skeleton h-20" />
                ))}
            </div>
        ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-canvas md:hidden">
                {appointments.map((appointment) => {
                    const dateTime = getDateTimeLine(appointment);
                    return (
                        <li key={appointment.id} className="flex flex-col items-start gap-1 px-4 py-3">
                            {appointment.appointmentCode && <p className="num text-title text-ink">{appointment.appointmentCode}</p>}
                            {dateTime && <p className="num text-body-sm">{dateTime}</p>}
                            <p className="text-body-sm text-ink">{appointment.serviceName}</p>
                            <p className="text-caption text-muted">{appointment.doctorName}</p>
                            <AppointmentStatus appointment={appointment} />
                            <DetailLink to={getAppointmentDetailRoute(appointment.id)} context={getLinkContext(appointment)} className="min-h-11">
                                Xem chi tiết
                            </DetailLink>
                        </li>
                    );
                })}
            </ul>
        )}
    </>
);

export default AppointmentTable;
