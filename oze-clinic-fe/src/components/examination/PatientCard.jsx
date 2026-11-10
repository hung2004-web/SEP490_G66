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

// Placeholder while no patient is called in.
const EmptyPatientCard = () => (
    <section aria-label="Chưa có bệnh nhân" className="card-app flex items-center gap-3.5 border-dashed px-5 py-4">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-tint font-semibold text-muted">
            ?
        </span>
        <div className="min-w-0">
            <h2 className="font-heading text-heading-3 text-muted">Chưa có bệnh nhân</h2>
            <p className="text-caption text-muted">Chọn “Gọi vào khám” ở hàng chờ bên trái</p>
        </div>
    </section>
);

// Patient of the exam, on top of the exam area. Without a patient it shows the "Chưa có bệnh nhân" placeholder.
// patient: { name, code, gender, age, queueNumber, startedAt? (ms) }; status: { label, tone } with tone = success | info | warning | danger | neutral.
const PatientCard = ({ patient, status, services = [], action }) => {
    if (!patient) return <EmptyPatientCard />;

    return (
        <section aria-label={`Bệnh nhân ${patient.name}`} className="card-app flex flex-col gap-3.5 px-5 py-4">
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
        </section>
    );
};

export default PatientCard;
