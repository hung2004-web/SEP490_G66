import { useId } from "react";
import { Check } from "lucide-react";
import { cx } from "@/utils/cx";
import { EXAM_SYMPTOMS } from "@/utils/messages";
import ClinicalExamSection from "./ClinicalExamSection";

// "Triệu chứng": tick common symptoms + free-text description. value: the selected symptom labels.
const SymptomSection = ({ options = EXAM_SYMPTOMS, value = [], note = "", onChange, onNoteChange }) => {
    const noteId = useId();
    const toggle = (symptom) => onChange?.(value.includes(symptom) ? value.filter((item) => item !== symptom) : [...value, symptom]);

    return (
        <ClinicalExamSection
            title="Triệu chứng"
            action={value.length > 0 && <span className="num rounded-full bg-primary-soft px-2 py-0.5 text-caption font-medium text-primary">{value.length} đã chọn</span>}
            bodyClassName="flex flex-col gap-4"
        >
            <fieldset>
                <legend className="mb-2 font-medium text-ink">Triệu chứng thường gặp</legend>
                <div className="flex flex-wrap gap-2">
                    {options.map((symptom) => {
                        const selected = value.includes(symptom);
                        return (
                            <button
                                key={symptom}
                                type="button"
                                aria-pressed={selected}
                                className={cx(
                                    "flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-caption outline-none transition-colors focus-visible:shadow-focus",
                                    selected ? "border-primary bg-primary-soft font-medium text-primary" : "border-border-strong bg-canvas text-body hover:border-primary",
                                )}
                                onClick={() => toggle(symptom)}
                            >
                                {selected && <Check className="size-3.5" aria-hidden="true" />}
                                {symptom}
                            </button>
                        );
                    })}
                </div>
            </fieldset>
            <div className="field">
                <label htmlFor={noteId} className="label">
                    Mô tả thêm
                </label>
                <textarea
                    id={noteId}
                    className="input"
                    placeholder="Ví dụ: Ê buốt răng hàm dưới trái khoảng 1 tuần, tăng dần. Gõ dọc răng 36 đau, thử lạnh đau kéo dài trên 10 giây."
                    value={note}
                    onChange={(event) => onNoteChange?.(event.target.value)}
                />
            </div>
        </ClinicalExamSection>
    );
};

export default SymptomSection;
