import { useId, useState } from "react";
import { ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp, Users } from "lucide-react";
import { cx } from "@/utils/cx";
import { isQueueBusy, queueNumberTone } from "@/utils/examination";
import { QUEUE_STATUS } from "@/utils/messages";
import QueueDoneFooter from "./QueueDoneFooter";
import QueueItem from "./QueueItem";

// "Ca sáng 08:00 – 12:00 · 5 chờ"
const shiftText = (shift, count) => [shift && `${shift.name} ${shift.start} – ${shift.end}`, `${count} chờ`].filter(Boolean).join(" · ");

// Left column of the exam screen. shift: { name, start, end, roomName }; items: see QueueItem; done: see QueueDoneFooter.
// Collapsed, it shows only the queue numbers so the exam area gets more room.
const QueuePanel = ({
    shift,
    items = [],
    done = [],
    selectedId,
    collapsed = false,
    onToggleCollapse,
    onSelect,
    onCall,
    onMarkAbsent,
    onStart,
}) => {
    const titleId = useId();
    const [doneOpen, setDoneOpen] = useState(false);
    const canCall = !isQueueBusy(items);
    // Desktop collapses sideways (a 64px column), smaller screens collapse to a strip above the exam.
    const SideIcon = collapsed ? ChevronsRight : ChevronsLeft;
    const StackIcon = collapsed ? ChevronsDown : ChevronsUp;

    const collapseButton = onToggleCollapse && (
        <button
            type="button"
            className="btn btn-secondary btn-icon size-9 shrink-0"
            aria-label={collapsed ? "Mở rộng hàng chờ" : "Thu gọn hàng chờ"}
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
        >
            <SideIcon className="hidden size-4 lg:block" aria-hidden="true" />
            <StackIcon className="size-4 lg:hidden" aria-hidden="true" />
        </button>
    );

    if (collapsed) {
        const called = items.find((item) => item.status === QUEUE_STATUS.CALLED);
        return (
            <aside aria-labelledby={titleId} className="card-app flex w-full flex-wrap items-center gap-2 p-2 lg:w-16 lg:flex-col lg:flex-nowrap">
                <h2 id={titleId} className="sr-only">
                    Hàng chờ
                </h2>
                <span>{collapseButton}</span>
                <ul className="order-first flex min-w-0 flex-1 gap-1.5 overflow-x-auto lg:order-none lg:flex-none lg:flex-col lg:overflow-visible">
                    {items.map((item) => {
                        const numberClass = cx("num grid size-9 place-items-center rounded-md font-semibold", queueNumberTone(item.status, item.id === selectedId));
                        const label = `Số ${item.queueNumber} · ${item.patientName}`;
                        return (
                            <li key={item.id}>
                                {item.status === QUEUE_STATUS.WAITING ? (
                                    <span title={item.patientName} aria-label={`${label} · đang chờ`} className={numberClass}>
                                        {item.queueNumber}
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        title={item.patientName}
                                        aria-label={label}
                                        aria-pressed={item.id === selectedId}
                                        className={cx(numberClass, "cursor-pointer outline-none focus-visible:shadow-focus")}
                                        onClick={() => onSelect?.(item.id)}
                                    >
                                        {item.queueNumber}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
                {/* Strip (below lg): the called patient's actions stay reachable without opening the queue. */}
                {called && (
                    <div className="flex w-full items-center gap-2 border-t border-border px-1 pt-2 lg:hidden">
                        <span className="min-w-0 flex-1 truncate text-caption text-muted">
                            Số {called.queueNumber} · {called.patientName}
                        </span>
                        <button
                            type="button"
                            className="btn h-9 border-danger bg-canvas px-3 text-caption text-danger hover:bg-danger-soft"
                            onClick={() => onMarkAbsent?.(called.id)}
                        >
                            Báo vắng mặt
                        </button>
                        <button type="button" className="btn btn-primary h-9 px-3 text-caption" onClick={() => onStart?.(called.id)}>
                            Bắt đầu khám
                        </button>
                    </div>
                )}
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

            <QueueDoneFooter items={done} expanded={doneOpen} onToggle={() => setDoneOpen(!doneOpen)} />
        </aside>
    );
};

export default QueuePanel;
