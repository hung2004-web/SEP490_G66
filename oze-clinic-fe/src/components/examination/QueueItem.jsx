import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { queueNumberTone } from "@/utils/examination";
import { EXAM_QUEUE_STATUS, QUEUE_STATUS } from "@/utils/messages";

const SMALL_BUTTON = "h-8 px-3 text-caption";

// One patient in the exam queue. item: { id, queueNumber, patientName, status (QUEUE_STATUS) }.
// canCall is false while another patient is called or being examined, so only one patient is in at a time.
const QueueItem = ({ item, selected = false, canCall = true, onSelect, onCall, onMarkAbsent, onStart }) => {
    const called = item.status === QUEUE_STATUS.CALLED;
    const waiting = item.status === QUEUE_STATUS.WAITING;

    return (
        <li
            className={cx(
                "flex gap-3 border-b border-border px-4 py-3 transition-colors",
                selected ? (called ? "bg-warning-soft" : "bg-primary-soft") : "hover:bg-surface-tint",
            )}
        >
            <span className={cx("num grid size-9 shrink-0 place-items-center rounded-md text-body-md font-semibold", queueNumberTone(item.status, selected))}>
                {item.queueNumber}
            </span>
            <div className="min-w-0 flex-1 self-center">
                <button
                    type="button"
                    aria-pressed={selected}
                    className="flex w-full min-w-0 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded text-left outline-none focus-visible:shadow-focus"
                    onClick={() => onSelect?.(item.id)}
                >
                    <span className="truncate font-semibold text-ink">{item.patientName}</span>
                    <StatusBadge status={item.status} labels={EXAM_QUEUE_STATUS} />
                </button>
                {called && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            className={cx("btn border-danger bg-canvas text-danger hover:bg-danger-soft", SMALL_BUTTON)}
                            onClick={() => onMarkAbsent?.(item.id)}
                        >
                            Báo vắng mặt
                        </button>
                        <button type="button" className={cx("btn btn-primary", SMALL_BUTTON)} onClick={() => onStart?.(item.id)}>
                            Bắt đầu khám
                        </button>
                    </div>
                )}
                {waiting && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" className={cx("btn btn-secondary", SMALL_BUTTON)} disabled={!canCall} onClick={() => onCall?.(item.id)}>
                            Gọi vào khám
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
};

export default QueueItem;
