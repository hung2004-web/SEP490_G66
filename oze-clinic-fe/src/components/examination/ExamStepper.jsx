import { Check, Lock } from "lucide-react";
import { cx } from "@/utils/cx";
import { EXAM_STEPS } from "@/utils/messages";

const STEP_STATE = {
    done: { note: "Đã xong", dot: "bg-success-solid text-on-primary", label: "font-medium text-ink", noteTone: "text-success" },
    current: { note: "Đang thực hiện", dot: "bg-primary font-bold text-on-primary", label: "font-semibold text-primary", noteTone: "font-semibold text-primary" },
    next: { note: "Tiếp theo", dot: "border-2 border-primary bg-canvas font-semibold text-primary", label: "font-medium text-ink", noteTone: "text-body" },
    todo: { note: "Chưa mở", dot: "border border-border bg-surface-tint text-muted", label: "font-medium text-muted", noteTone: "text-muted" },
    locked: { note: "Chưa mở", dot: "border border-border bg-surface-tint text-placeholder", label: "font-medium text-placeholder", noteTone: "text-placeholder" },
};

const stateOf = (index, current, locked) => {
    if (locked) return "locked";
    if (index < current) return "done";
    if (index === current) return "current";
    return index === current + 1 ? "next" : "todo";
};

// "Quy trình khám": the 5 steps of a visit. current: index of the step in progress (earlier steps are done).
// viewing: index of the step shown below (defaults to current). onStepClick lets the doctor reopen done steps.
// locked: no exam started yet (no patient, or called but not in the room) — every step shows a lock.
const ExamStepper = ({ steps = EXAM_STEPS, current = 0, viewing = current, locked = false, onStepClick }) => {
    const doneCount = locked ? 0 : current;
    const percent = Math.round((doneCount / steps.length) * 100);

    return (
        <nav aria-label="Quy trình khám" className="card-app flex flex-col gap-2.5 px-5 pt-4 pb-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="text-caption font-semibold text-ink">Quy trình khám</p>
                    <p className="text-caption text-muted">Làm lần lượt từng bước · hoàn thành bước hiện tại để mở bước tiếp theo</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-30 overflow-hidden rounded-full bg-border" aria-hidden="true">
                        <span className="block h-full rounded-full bg-success-solid" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="num text-caption text-body">
                        Đã xong {doneCount}/{steps.length} bước
                    </span>
                </div>
            </div>
            <ol className="flex overflow-x-auto">
                {steps.map((step, index) => {
                    const state = stateOf(index, current, locked);
                    const meta = STEP_STATE[state];
                    const clickable = !locked && onStepClick && index <= current;
                    const shown = !locked && index === viewing;
                    const lineDone = (filled) => (!locked && filled ? "bg-success-solid" : "bg-border");
                    const content = (
                        <>
                            <span className="flex w-full items-center" aria-hidden="true">
                                <span className={cx("h-0.5 flex-1", index === 0 ? "opacity-0" : lineDone(index <= current))} />
                                <span className={cx("num grid size-7 shrink-0 place-items-center rounded-full text-caption", meta.dot)}>
                                    {state === "done" && <Check className="size-4" />}
                                    {state === "locked" && <Lock className="size-3.5" />}
                                    {state !== "done" && state !== "locked" && index + 1}
                                </span>
                                <span className={cx("h-0.5 flex-1", index === steps.length - 1 ? "opacity-0" : lineDone(index < current))} />
                            </span>
                            <span className={cx("px-1 text-caption whitespace-nowrap", meta.label)}>{step}</span>
                            <span className={cx("text-[11px] leading-tight", meta.noteTone)}>{meta.note}</span>
                        </>
                    );
                    const itemClass = cx("flex w-full flex-col items-center gap-1.5 rounded-[10px] py-2 text-center", shown && "bg-primary-soft");

                    return (
                        <li key={step} aria-current={state === "current" ? "step" : undefined} className="min-w-32 flex-1">
                            {clickable ? (
                                <button
                                    type="button"
                                    aria-pressed={shown}
                                    className={cx(itemClass, "cursor-pointer outline-none focus-visible:shadow-focus", !shown && "hover:bg-surface-tint")}
                                    onClick={() => onStepClick(index)}
                                >
                                    {content}
                                </button>
                            ) : (
                                <div className={itemClass}>{content}</div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default ExamStepper;
