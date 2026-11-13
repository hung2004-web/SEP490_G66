import ClinicalExamSection from "./ClinicalExamSection";

// "Ghi chú" of the session: extra costs or anything reception / the next doctor should know. Saved with the draft.
const TreatmentNoteCard = ({ value = "", readOnly = false, onChange }) => (
    <ClinicalExamSection title="Ghi chú">
        <textarea
            className="input min-h-21"
            aria-label="Ghi chú buổi điều trị"
            placeholder="Ghi lại chi phí phát sinh nếu có. Ví dụ: thêm 1 ống thuốc tê do bệnh nhân nhạy cảm đau."
            value={value}
            readOnly={readOnly}
            onChange={(event) => onChange?.(event.target.value)}
        />
    </ClinicalExamSection>
);

export default TreatmentNoteCard;
