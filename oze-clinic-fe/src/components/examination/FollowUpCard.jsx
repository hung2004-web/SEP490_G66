import { useId, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { planSessionLabel, validateFollowUp } from "@/utils/examination";
import { addDays, formatClock, parseDateOnly, toDateOnly } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";
import FollowUpSlotPicker from "./FollowUpSlotPicker";

const Required = () => <span className="text-danger-solid"> *</span>;

const FieldError = ({ id, message }) =>
    message ? (
        <p id={id} className="error-text">
            {message}
        </p>
    ) : null;

// "Hẹn tái khám": the doctor picks the next session of the plan, a date and a slot, then asks reception to book it.
// sessions: upcoming sessions (upcomingPlanSessions). value: { sessionId, date, slot, note } (owned by the parent, saved with the draft).
// slots / slotsBusy: free slots of value.date (the parent loads them when the date changes). today: "yyyy-mm-dd", the date must be after it.
// sentAt: when it was last sent to reception (ISO), shown as a confirmation. onChange receives the changed fields; onSubmit(value) after validation.
const FollowUpCard = ({ sessions = [], value, slots = [], slotsBusy = false, today, busy = false, sentAt, onChange, onSubmit }) => {
    const ids = { session: useId(), sessionError: useId(), date: useId(), dateError: useId(), slotError: useId(), note: useId() };
    const [errors, setErrors] = useState({});
    const minDate = today ? toDateOnly(addDays(parseDateOnly(today), 1)) : undefined;

    const change = (changes) => {
        onChange(changes);
        const touched = Object.keys(changes);
        if (touched.some((key) => errors[key])) setErrors((current) => ({ ...current, ...Object.fromEntries(touched.map((key) => [key, null])) }));
    };

    // Picking a session fills an empty date with its planned one; a new date drops the slot of the old one.
    const changeSession = (sessionId) => {
        const session = sessions.find((item) => item.id === sessionId);
        const plannedDate = !value.date && session?.date && (!today || session.date > today) ? session.date : null;
        change({ sessionId, ...(plannedDate && { date: plannedDate, slot: "" }) });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const result = validateFollowUp(value, today);
        setErrors(result);
        if (result.count === 0) onSubmit(value);
    };

    if (sessions.length === 0) {
        return (
            <ClinicalExamSection title="Hẹn tái khám">
                <p className="text-muted">Đây là buổi cuối của kế hoạch, không cần hẹn tái khám.</p>
            </ClinicalExamSection>
        );
    }

    return (
        <ClinicalExamSection title="Hẹn tái khám">
            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="field">
                    <label htmlFor={ids.session} className="label">
                        Buổi tiếp theo
                        <Required />
                    </label>
                    <select
                        id={ids.session}
                        className="input"
                        value={value.sessionId}
                        aria-invalid={errors.sessionId ? true : undefined}
                        aria-describedby={errors.sessionId ? ids.sessionError : undefined}
                        onChange={(event) => changeSession(event.target.value)}
                    >
                        <option value="">Chọn buổi trong kế hoạch</option>
                        {sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {planSessionLabel(session)}
                            </option>
                        ))}
                    </select>
                    <FieldError id={ids.sessionError} message={errors.sessionId} />
                </div>

                <div className="field">
                    <label htmlFor={ids.date} className="label">
                        Ngày hẹn
                        <Required />
                    </label>
                    <input
                        id={ids.date}
                        type="date"
                        className="input"
                        min={minDate}
                        value={value.date}
                        aria-invalid={errors.date ? true : undefined}
                        aria-describedby={errors.date ? ids.dateError : undefined}
                        onChange={(event) => change({ date: event.target.value, slot: "" })}
                    />
                    <FieldError id={ids.dateError} message={errors.date} />
                </div>

                <FollowUpSlotPicker
                    slots={value.date ? slots : []}
                    value={value.slot}
                    busy={slotsBusy}
                    error={errors.slot}
                    errorId={ids.slotError}
                    onChange={(slot) => change({ slot })}
                />

                <div className="field">
                    <label htmlFor={ids.note} className="label">
                        Ghi chú cho lễ tân
                    </label>
                    <textarea
                        id={ids.note}
                        className="input min-h-24"
                        placeholder="Ví dụ: Bệnh nhân muốn hẹn buổi sáng"
                        value={value.note}
                        onChange={(event) => change({ note: event.target.value })}
                    />
                </div>

                {sentAt && (
                    <p role="status" className="alert alert-success gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        Đã gửi lễ tân lúc {formatClock(sentAt)}. Lễ tân sẽ đặt lịch và báo lại cho bệnh nhân.
                    </p>
                )}

                <div>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy && <span className="btn-spinner" aria-hidden="true" />}
                        {sentAt ? "Gửi lại cho lễ tân" : "Gửi lễ tân đặt lịch hẹn"}
                    </button>
                </div>
            </form>
        </ClinicalExamSection>
    );
};

export default FollowUpCard;
