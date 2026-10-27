import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardSection from "@/components/dashboard/DashboardSection";
import { cx } from "@/utils/cx";
import { formatDate } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE, MESSAGES } from "@/utils/messages";
import { ROUTES, getMedicalRecordDetailRoute } from "@/utils/routes";

const TITLE_ID = "patient-dashboard-visits";

const DetailLink = ({ visit, className }) => {
    if (visit.examinationId == null) return null;
    const date = formatDate(visit.appointmentDate);
    return (
        <Link to={getMedicalRecordDetailRoute(visit.examinationId)} className={cx("btn btn-link", className)}>
            Xem chi tiết
            {date && <span className="sr-only"> lần khám ngày {date}</span>}
        </Link>
    );
};

const RecentVisitsSection = ({ visits = [], loading = false, failed = false }) => {
    const loaded = !loading && !failed;

    return (
        <DashboardSection
            id={TITLE_ID}
            title="Lần khám gần đây"
            busy={loading}
            link={loaded && visits.length > 0 && { to: ROUTES.MEDICAL_RECORD, label: "Xem hồ sơ bệnh án" }}
            error={!loading && failed && GENERIC_ERROR_MESSAGE}
            empty={loaded && visits.length === 0 && { icon: FileText, text: MESSAGES.MSG38 }}
        >
            {loading && (
                <div aria-hidden="true" className="flex flex-col gap-4">
                    <div className="skeleton h-12" />
                    <div className="skeleton h-12" />
                    <div className="skeleton h-12" />
                </div>
            )}
            {loaded && visits.length > 0 && (
                <>
                    <div className="table-wrap hidden md:block">
                        <table className="table" aria-labelledby={TITLE_ID}>
                            <thead>
                                <tr>
                                    <th scope="col">Ngày khám</th>
                                    <th scope="col">Dịch vụ</th>
                                    <th scope="col">Bác sĩ</th>
                                    <th scope="col">
                                        <span className="sr-only">Xem chi tiết</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {visits.map((visit) => (
                                    <tr key={visit.id}>
                                        <td>{formatDate(visit.appointmentDate)}</td>
                                        <td className="cell-primary">{visit.serviceName}</td>
                                        <td>{visit.doctorName}</td>
                                        <td className="text-right">
                                            <DetailLink visit={visit} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ul className="divide-y divide-border rounded-lg border border-border md:hidden">
                        {visits.map((visit) => (
                            <li key={visit.id} className="flex flex-col items-start gap-1 px-4 py-3">
                                <p className="num text-title text-ink">{formatDate(visit.appointmentDate)}</p>
                                <p className="text-body-sm text-ink">{visit.serviceName}</p>
                                <p className="text-caption text-muted">{visit.doctorName}</p>
                                <DetailLink visit={visit} className="min-h-11" />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </DashboardSection>
    );
};

export default RecentVisitsSection;
