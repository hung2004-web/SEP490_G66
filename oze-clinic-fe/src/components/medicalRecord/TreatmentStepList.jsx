import { displayText } from "@/utils/medicalRecord";
import { Check } from "lucide-react";
import { cx } from "@/utils/cx";

const TreatmentStepList = ({ stages }) => (
    <ol className="flex flex-col">
        {stages.map((stage, index) => {
            const isLast = index === stages.length - 1;
            const done = stage.status === "done";
            const next = stage.status === "next";
            return (
                <li key={`${index}-${stage.name}`} className={cx("relative flex gap-2.5", !isLast && "pb-3")}>
                    {!isLast && (
                        <span aria-hidden="true" className={cx("absolute bottom-0 left-2.5 top-5.5 w-0.5", done ? "bg-success-solid" : "bg-border")} />
                    )}
                    <span
                        aria-hidden="true"
                        className={cx(
                            "relative z-10 grid size-5.5 shrink-0 place-items-center rounded-full border-2",
                            done && "border-success-solid bg-success-solid text-on-primary",
                            next && "border-primary bg-canvas ring-3 ring-primary-soft",
                            !done && !next && "border-border bg-canvas",
                        )}
                    >
                        {done && <Check className="size-3" />}
                    </span>
                    <div className="min-w-0">
                        <p className={cx("text-body-sm", stage.status === "todo" ? "font-medium text-muted" : "font-semibold text-ink")}>{displayText(stage.name)}</p>
                        <span className="text-caption text-muted">{displayText(stage.note)}</span>
                    </div>
                </li>
            );
        })}
    </ol>
);

export default TreatmentStepList;
