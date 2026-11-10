import { cx } from "@/utils/cx";
import { formatDate, formatPhone } from "@/utils/format";
import { displayText } from "@/utils/medicalRecord";
import { GENDER_LABELS } from "@/utils/messages";
import ClinicalExamSection from "./ClinicalExamSection";

const Field = ({ label, value, className }) => (
    <div className={cx("flex min-w-0 flex-col gap-0.5", className)}>
        <dt className="text-caption text-muted">{label}</dt>
        <dd className="font-medium break-words text-ink">{displayText(value || null)}</dd>
    </div>
);

// "Thông tin hành chính" (read only: reception owns these fields).
// patient: { code, name, birthdate (yyyy-mm-dd), age, gender, phone, emergencyPhone, address }.
const PatientInfoCard = ({ patient, reason }) => (
    <ClinicalExamSection
        title="Thông tin hành chính"
        divided={false}
        badge={<span className="rounded-full bg-surface-tint px-2 py-0.5 text-[11px] font-medium text-body">Chỉ xem</span>}
    >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-body-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Mã bệnh nhân" value={patient.code} />
            <Field label="Họ và tên" value={patient.name} />
            <Field label="Ngày sinh" value={patient.birthdate && formatDate(patient.birthdate)} />
            <Field label="Tuổi" value={patient.age != null && `${patient.age} tuổi`} />
            <Field label="Giới tính" value={GENDER_LABELS[patient.gender] ?? patient.gender} />
            <Field label="Số điện thoại" value={formatPhone(patient.phone)} />
            <Field label="SĐT khẩn cấp" value={formatPhone(patient.emergencyPhone)} />
            <Field label="Địa chỉ" value={patient.address} className="sm:col-span-1 lg:col-span-2" />
            <Field label="Lý do khám" value={reason} className="sm:col-span-2 lg:col-span-3" />
        </dl>
    </ClinicalExamSection>
);

export default PatientInfoCard;
