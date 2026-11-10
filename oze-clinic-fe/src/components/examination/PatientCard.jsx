import Avatar from "@/components/ui/Avatar";
import { cx } from "@/utils/cx";
import { formatClockTime } from "@/utils/examination";
import { GENDER_LABELS } from "@/utils/messages";
import ServiceChips from "./ServiceChips";

// "BN000123 · Nam · 28 tuổi · Số 8 · Bắt đầu 09:12"
const detailText = (patient) =>
    [
        patient.code,
        GENDER_LABELS[patient.gender] ?? patient.gender,
        patient.age != null && `${patient.age} tuổi`,
        patient.queueNumber != null && `Số ${patient.queueNumber}`,
        patient.startedAt && `Bắt đầu ${formatClockTime(patient.startedAt)}`,
    ]
        .filter(Boolean)
        .join(" · ");

// Patient being examined, on top of the exam area.
// patient: { name, code, gender, age, queueNumber, startedAt? (ms) }; status: { label, tone } with tone = success | info | warning | danger | neutral.
// children: rendered under the card body, e.g. <ExamTabs />.
const PatientCard = ({ patient, status, services = [], action, children }) => {
    if (!patient) return null;

    return (
        <section aria-label={`Bệnh nhân ${patient.name}`} className="card-app overflow-hidden p-0">
            <div className="flex flex-col gap-3.5 px-5 pt-4 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Avatar fullName={patient.name} size="lg" className="avatar-soft" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-heading text-heading-3 text-ink">{patient.name}</h2>
                            {status?.label && <span className={cx("badge", `badge-${status.tone ?? "neutral"}`)}>{status.label}</span>}
                        </div>
                        <p className="num text-caption text-muted">{detailText(patient)}</p>
                    </div>
                    {action}
                </div>
                <ServiceChips services={services} />
            </div>
            {children && <div className="border-t border-border px-5">{children}</div>}
        </section>
    );
};

export default PatientCard;
