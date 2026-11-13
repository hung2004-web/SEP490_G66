import { TriangleAlert } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import { GENDER_LABELS, IMAGING_REVIEW_STATUS } from "@/utils/messages";

// Patient of the selected X-ray result. patient: { name, code, gender, age, allergies[] }; status: IMAGING_REVIEW_STATUS key.
const ReviewPatientStrip = ({ patient, status }) => {
    const meta = [patient.code, GENDER_LABELS[patient.gender] ?? patient.gender, patient.age != null && `${patient.age} tuổi`].filter(Boolean).join(" · ");
    const allergies = (patient.allergies ?? []).filter(Boolean);

    return (
        <section aria-label={`Bệnh nhân ${patient.name}`} className="card-app flex items-center gap-3.5 px-[18px] py-3.5">
            <Avatar fullName={patient.name} size="lg" className="avatar-soft size-11 shrink-0 text-body-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="truncate font-heading text-body-lg font-semibold text-ink">{patient.name}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-caption text-muted">{meta}</span>
                    {allergies.map((allergy) => (
                        <span key={allergy} className="inline-flex items-center gap-1 rounded-full bg-danger-soft py-0.5 pr-2 pl-1.5 text-caption font-medium text-danger">
                            <TriangleAlert className="size-3" aria-hidden="true" />
                            Dị ứng {allergy}
                        </span>
                    ))}
                </div>
            </div>
            <StatusBadge status={status} labels={IMAGING_REVIEW_STATUS} />
        </section>
    );
};

export default ReviewPatientStrip;
