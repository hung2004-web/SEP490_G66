import { useId } from "react";
import { cx } from "@/utils/cx";

// Card frame shared by the sections of the "Khám" tab: title (+ optional description) on the left, action on the right.
const ClinicalExamSection = ({ title, description, action, className, bodyClassName, children }) => {
    const titleId = useId();

    return (
        <section aria-labelledby={titleId} className={cx("card-app p-0", className)}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="min-w-0">
                    <h3 id={titleId} className="font-semibold text-ink">
                        {title}
                    </h3>
                    {description && <p className="text-caption text-muted">{description}</p>}
                </div>
                {action}
            </div>
            <div className={cx("p-5", bodyClassName)}>{children}</div>
        </section>
    );
};

export default ClinicalExamSection;
