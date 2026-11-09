import { useId } from "react";
import { ChevronsLeft, ChevronsRight, Users } from "lucide-react";
import { cx } from "@/utils/cx";
import { isQueueBusy, queueNumberTone } from "@/utils/examination";
import { QUEUE_STATUS } from "@/utils/messages";
import QueueDoneFooter from "./QueueDoneFooter";
import QueueItem from "./QueueItem";

// "Ca sáng 08:00 – 12:00 · 5 chờ"
const shiftText = (shift, count) => [shift && `${shift.name} ${shift.start} – ${shift.end}`, `${count} chờ`].filter(Boolean).join(" · ");

// Left column of the exam screen. shift: { name, start, end, roomName }; items: see QueueItem.
// Collapsed, it shows only the queue numbers so the exam area gets more room.
const QueuePanel = ({
    shift,
    items = [],
    doneCount = 0,
    selectedId,
    collapsed = false,
    onToggleCollapse,
    onSelect,
    onCall,
    onMarkAbsent,
    onStart,
    onOpenDone,
}) => {
    const titleId = useId();
    const canCall = !isQueueBusy(items);
    const CollapseIcon = collapsed ? ChevronsRight : ChevronsLeft;

    const collapseButton = onToggleCollapse && (
        <button
            type="button"
            className="btn btn-secondary btn-icon size-9 shrink-0"
            aria-label={collapsed ? "Mở rộng hàng chờ" : "Thu gọn hàng chờ"}
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
        >
            <CollapseIcon className="size-4" aria-hidden="true" />
        </button>
    );

    if (collapsed) {
        return (
            <aside aria-labelledby={titleId} className="card-app flex w-16 flex-col items-center gap-2 p-2">
                <h2 id={titleId} className="sr-only">
                    Hàng chờ
                </h2>
                {collapseButton}
                <ul className="flex flex-col gap-1.5">
                    {items.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                title={item.patientName}
                                aria-label={`Số ${item.queueNumber} · ${item.patientName}`}
                                aria-pressed={item.id === selectedId}
                                className={cx(
                                    "num grid size-9 cursor-pointer place-items-center rounded-md font-semibold outline-none focus-visible:shadow-focus",
                                    queueNumberTone(item.status, item.id === selectedId),
                                )}
                                onClick={() => onSelect?.(item.id)}
                            >
                                {item.queueNumber}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>
        );
    }

    return (
        <aside aria-labelledby={titleId} className="card-app flex flex-col overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                    <h2 id={titleId} className="font-semibold text-ink">
                        Hàng chờ · {shift?.roomName ?? "Phòng khám"}
                    </h2>
                    <p className="text-caption text-muted">{shiftText(shift, items.filter((item) => item.status !== QUEUE_STATUS.IN_EXAMINATION).length)}</p>
                </div>
                {collapseButton}
            </div>

            {items.length > 0 ? (
                <ul className="flex-1 overflow-y-auto">
                    {items.map((item) => (
                        <QueueItem
                            key={item.id}
                            item={item}
                            selected={item.id === selectedId}
                            canCall={canCall}
                            onSelect={onSelect}
                            onCall={onCall}
                            onMarkAbsent={onMarkAbsent}
                            onStart={onStart}
                        />
                    ))}
                </ul>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center text-muted">
                    <Users className="size-6" aria-hidden="true" />
                    <p>Hàng chờ đang trống.</p>
                </div>
            )}

            <QueueDoneFooter count={doneCount} onClick={onOpenDone} />
        </aside>
    );
};

export default QueuePanel;
