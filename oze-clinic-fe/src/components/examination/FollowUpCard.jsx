import { useId } from "react";
import { cx } from "@/utils/cx";
import { addDays, formatDate, parseDateOnly, toDateOnly } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

// Same day n months later; the 31st of a shorter month falls back to its last day.
const addMonths = (date, months) => {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
    return new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), lastDay));
};

const QUICK_PICKS = [
    { label: "Sau 1 tuần", next: (date) => addDays(date, 7) },
    { label: "1 tháng", next: (date) => addMonths(date, 1) },
    { label: "3 tháng", next: (date) => addMonths(date, 3) },
    { label: "6 tháng", next: (date) => addMonths(date, 6) },
];

// "Hẹn tái khám": shown once the whole plan is done. The doctor only proposes a date for the check-up visit
// (optional); it is saved with the visit and reception books the time with the patient.
// value: "yyyy-mm-dd" or "". today: "yyyy-mm-dd", the date must be after it. onChange(date) ("" removes it).
const FollowUpCard = ({ value = "", today, readOnly = false, onChange }) => {
    const ids = { date: useId(), help: useId() };
    const base = today ? parseDateOnly(today) : new Date();
    const minDate = toDateOnly(addDays(base, 1));
    const tooEarly = Boolean(value) && value < minDate;

    return (
        <ClinicalExamSection title="Hẹn tái khám" description="Đã hoàn thành kế hoạch điều trị. Hẹn bệnh nhân quay lại kiểm tra (không bắt buộc).">
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn nhanh ngày tái khám">
                    {QUICK_PICKS.map((pick) => {
                        const date = toDateOnly(pick.next(base));
                        const selected = value === date;
                        return (
                            <button
                                key={pick.label}
                                type="button"
                                aria-pressed={selected}
                                disabled={readOnly}
                                className={cx("btn h-9 px-3 text-body-sm", selected ? "btn-primary" : "btn-secondary")}
                                onClick={() => onChange(date)}
                            >
                                {pick.label}
                            </button>
                        );
                    })}
                </div>

                <div className="field">
                    <label htmlFor={ids.date} className="label">
                        Ngày tái khám dự kiến
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
                            aria-describedby={ids.help}
                            onChange={(event) => onChange(event.target.value)}
                        />
                        {value && !readOnly && (
                            <button type="button" className="cursor-pointer rounded text-body-sm font-medium text-danger outline-none hover:underline focus-visible:shadow-focus" onClick={() => onChange("")}>
                                Bỏ hẹn
                            </button>
                        )}
                    </div>
                    {tooEarly ? (
                        <p id={ids.help} className="error-text">
                            Ngày hẹn phải sau hôm nay.
                        </p>
                    ) : (
                        <p id={ids.help} className="text-caption text-muted">
                            {value ? `Lễ tân sẽ liên hệ bệnh nhân để xếp giờ cho ngày ${formatDate(value)}.` : "Chưa hẹn tái khám."}
                        </p>
                    )}
                </div>
            </div>
        </ClinicalExamSection>
    );
};

export default FollowUpCard;
