import { useId } from "react";
import { cx } from "@/utils/cx";

// Card frame shared by the exam steps: title (+ badge, description) on the left, action on the right.
// divided: a line between the head and the body (the step 1 cards have none). flush: no body padding (tables, lists).
const ClinicalExamSection = ({ title, badge, description, action, divided = true, flush = false, className, bodyClassName, children }) => {
    const titleId = useId();

    return (
        <section aria-labelledby={titleId} className={cx("card-app p-0", className)}>
            <div className={cx("flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5", divided ? "border-b border-border py-3.5" : "pt-4 pb-3")}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h3 id={titleId} className="card-title">
                        {title}
                    </h3>
                    {badge}
                    {description && <p className="w-full text-caption text-muted">{description}</p>}
                </div>
                {action}
            </div>
            <div className={cx(!flush && "p-5", !flush && !divided && "pt-3", bodyClassName)}>{children}</div>
        </section>
    );
};

export default ClinicalExamSection;
