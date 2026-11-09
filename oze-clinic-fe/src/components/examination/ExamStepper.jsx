import { Check } from "lucide-react";
import { cx } from "@/utils/cx";
import { EXAM_STEPS } from "@/utils/messages";

// Progress of the visit. steps: labels in order; current: index of the step in progress (earlier steps count as done).
const ExamStepper = ({ steps = EXAM_STEPS, current = 0 }) => (
    <nav aria-label="Tiến trình khám" className="card-app px-5 py-4">
        <ol className="flex items-start">
            {steps.map((step, index) => {
                const done = index < current;
                const active = index === current;
                return (
                    <li key={step} aria-current={active ? "step" : undefined} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
                        {index > 0 && (
                            <span
                                aria-hidden="true"
                                className={cx("absolute top-3.5 right-1/2 h-0.5 w-full", index <= current ? "bg-success-solid" : "bg-border")}
                            />
                        )}
                        <span
                            className={cx(
                                "num relative z-10 grid size-7 place-items-center rounded-full text-caption font-semibold",
                                done && "bg-success-solid text-on-primary",
                                active && "bg-primary text-on-primary ring-4 ring-primary-soft",
                                !done && !active && "bg-surface-muted text-muted",
                            )}
                        >
                            {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                        </span>
                        <span className={cx("px-1 text-caption", active ? "font-semibold text-ink" : done ? "text-body" : "text-muted")}>
                            {step}
                            {done && <span className="sr-only"> (đã xong)</span>}
                        </span>
                    </li>
                );
            })}
        </ol>
    </nav>
);

export default ExamStepper;
