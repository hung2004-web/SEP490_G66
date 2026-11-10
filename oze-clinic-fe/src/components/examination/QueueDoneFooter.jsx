import { ChevronRight } from "lucide-react";

// Footer of the queue panel: patients already examined in this shift.
const QueueDoneFooter = ({ count = 0, onClick }) => (
    <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-2 bg-surface-tint px-4 py-3 text-caption font-semibold uppercase tracking-wide text-muted outline-none transition-colors hover:text-primary focus-visible:shadow-focus"
        onClick={onClick}
    >
        <span className="flex items-center gap-1">
            Đã khám trong ca
            <ChevronRight className="size-3.5" aria-hidden="true" />
        </span>
        <span className="num rounded-md bg-surface-muted px-2 py-0.5 text-ink">{count}</span>
    </button>
);

export default QueueDoneFooter;
