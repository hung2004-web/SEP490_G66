import { useId } from "react";
import { cx } from "@/utils/cx";
import { EXAM_SYMPTOMS } from "@/utils/messages";
import ClinicalExamSection from "./ClinicalExamSection";

// "Triệu chứng": tick common symptoms + free-text exam notes. value: the selected symptom labels.
const SymptomSection = ({ options = EXAM_SYMPTOMS, value = [], note = "", onChange, onNoteChange, action }) => {
    const noteId = useId();
    const toggle = (symptom) => onChange?.(value.includes(symptom) ? value.filter((item) => item !== symptom) : [...value, symptom]);

    return (
        <ClinicalExamSection title="Triệu chứng" action={action} bodyClassName="flex flex-col gap-4">
            <fieldset>
                <legend className="mb-2 text-caption font-semibold text-muted">Triệu chứng thường gặp</legend>
                <div className="flex flex-wrap gap-2">
                    {options.map((symptom) => {
                        const selected = value.includes(symptom);
                        return (
                            <button
                                key={symptom}
                                type="button"
                                aria-pressed={selected}
                                className={cx(
                                    "cursor-pointer rounded-full border px-3 py-1 text-caption outline-none transition-colors focus-visible:shadow-focus",
                                    selected ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border bg-canvas text-body hover:border-primary",
                                )}
                                onClick={() => toggle(symptom)}
                            >
                                {symptom}
                            </button>
                        );
                    })}
                </div>
            </fieldset>
            <div className="field">
                <label htmlFor={noteId} className="label">
                    Ghi chú khám
                </label>
                <textarea
                    id={noteId}
                    className="input"
                    placeholder="Mô tả thêm: vị trí đau, thời gian xuất hiện, yếu tố làm đau tăng…"
                    value={note}
                    onChange={(event) => onNoteChange?.(event.target.value)}
                />
            </div>
        </ClinicalExamSection>
    );
};

export default SymptomSection;
