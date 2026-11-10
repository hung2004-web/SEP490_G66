import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/utils/cx";

// "‹ 13/10 – 19/10/2026 ›": steps through periods (day, week, ...). The parent works out the label and the dates.
// className: e.g. "w-full" to stretch it; the label then takes the free space.
const PeriodNavigator = ({ label, onPrevious, onNext, previousDisabled = false, nextDisabled = false, className }) => (
    <div className={cx("inline-flex h-control items-center rounded-md border border-border bg-canvas", className)}>
        <button
            type="button"
            className="btn btn-icon size-9 hover:bg-surface-tint"
            aria-label="Kỳ trước"
            title="Kỳ trước"
            disabled={previousDisabled}
            onClick={onPrevious}
        >
            <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="num min-w-36 flex-1 px-1 text-center text-label text-ink" aria-live="polite">
            {label}
        </span>
        <button
            type="button"
            className="btn btn-icon size-9 hover:bg-surface-tint"
            aria-label="Kỳ sau"
            title="Kỳ sau"
            disabled={nextDisabled}
            onClick={onNext}
        >
            <ChevronRight className="size-4" aria-hidden="true" />
        </button>
    </div>
);

export default PeriodNavigator;
