import { useId } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cx } from "@/utils/cx";

// Bottom of the queue panel: patients already examined in this shift, opened / closed in place (read-only).
// items: [{ id, queueNumber, patientName, finishedAt ("HH:mm") }] in finishing order; the latest is shown first.
const QueueDoneFooter = ({ items = [], expanded = false, onToggle }) => {
    const listId = useId();

    return (
        <div className="border-t border-border bg-surface-tint">
            <button
                type="button"
                aria-expanded={expanded}
                aria-controls={listId}
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-caption font-semibold tracking-wide text-muted uppercase outline-none transition-colors hover:text-primary focus-visible:shadow-focus"
                onClick={onToggle}
            >
                <span className="flex items-center gap-1">
                    Đã khám trong ca
                    <ChevronRight className={cx("size-3.5 transition-transform", expanded && "rotate-90")} aria-hidden="true" />
                </span>
                <span className="num rounded-md bg-surface-muted px-2 py-0.5 text-ink">{items.length}</span>
            </button>
            {expanded &&
                (items.length === 0 ? (
                    <p id={listId} className="px-4 pb-3 text-caption text-muted">
                        Chưa có bệnh nhân nào khám xong trong ca.
                    </p>
                ) : (
                    <ul id={listId} className="max-h-64 overflow-y-auto">
                        {[...items].reverse().map((item) => (
                            <li key={item.id} className="flex items-center gap-3 border-t border-border px-4 py-2.5">
                                <span className="num grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted font-semibold text-muted">{item.queueNumber}</span>
                                <span className="min-w-0 flex-1 truncate text-body">{item.patientName}</span>
                                <span className="num shrink-0 text-caption text-muted">{item.finishedAt}</span>
                                <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                                <span className="sr-only">đã khám</span>
                            </li>
                        ))}
                    </ul>
                ))}
        </div>
    );
};

export default QueueDoneFooter;
