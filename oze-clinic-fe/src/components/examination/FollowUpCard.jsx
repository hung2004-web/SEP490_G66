import { useId } from "react";
import { addDays, parseDateOnly, toDateOnly } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

// "Hẹn tái khám": shown once the whole plan is done. The doctor picks the check-up date as they see fit (optional);
// it is saved with the visit.
// value: "yyyy-mm-dd" or "". today: "yyyy-mm-dd", the date must be after it. onChange(date) ("" removes it).
const FollowUpCard = ({ value = "", today, readOnly = false, onChange }) => {
    const ids = { date: useId(), error: useId() };
    const base = today ? parseDateOnly(today) : new Date();
    const minDate = toDateOnly(addDays(base, 1));
    const tooEarly = Boolean(value) && value < minDate;

    return (
        <ClinicalExamSection title="Hẹn tái khám" description="Đã hoàn thành kế hoạch điều trị. Hẹn bệnh nhân quay lại kiểm tra (không bắt buộc).">
            <div className="field">
                <label htmlFor={ids.date} className="label">
                    Ngày tái khám
                </label>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        id={ids.date}
                        type="date"
                        className="input w-auto min-w-44"
                        min={minDate}
                        value={value}
                        readOnly={readOnly}
                        aria-invalid={tooEarly ? true : undefined}
                        aria-describedby={tooEarly ? ids.error : undefined}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    {value && !readOnly && (
                        <button type="button" className="cursor-pointer rounded text-body-sm font-medium text-danger outline-none hover:underline focus-visible:shadow-focus" onClick={() => onChange("")}>
                            Bỏ hẹn
                        </button>
                    )}
                </div>
                {tooEarly && (
                    <p id={ids.error} className="error-text">
                        Ngày hẹn phải sau hôm nay.
                    </p>
                )}
            </div>
        </ClinicalExamSection>
    );
};

export default FollowUpCard;
