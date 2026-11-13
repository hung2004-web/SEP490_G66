import { PRESCRIPTION_LIMITS } from "@/utils/examination";
import ClinicalExamSection from "./ClinicalExamSection";

// "Ghi chú đơn thuốc": general advice printed with the prescription (Prescriptions.Notes, up to 500 characters).
const PrescriptionNoteCard = ({ value = "", readOnly = false, onChange }) => (
    <ClinicalExamSection title="Ghi chú đơn thuốc">
        <textarea
            className="input min-h-21"
            aria-label="Ghi chú đơn thuốc"
            maxLength={PRESCRIPTION_LIMITS.notes}
            placeholder="Dặn dò chung cho bệnh nhân. Ví dụ: tái khám nếu sưng đau kéo dài quá 3 ngày."
            value={value}
            readOnly={readOnly}
            onChange={(event) => onChange?.(event.target.value)}
        />
    </ClinicalExamSection>
);

export default PrescriptionNoteCard;
