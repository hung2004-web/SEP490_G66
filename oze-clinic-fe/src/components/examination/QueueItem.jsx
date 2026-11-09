import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { EXAM_QUEUE_STATUS, QUEUE_STATUS } from "@/utils/messages";

const SMALL_BUTTON = "h-8 px-3 text-caption";

// One patient in the exam queue. item: { id, queueNumber, patientName, status (QUEUE_STATUS) }.
// canCall is false while another patient is already called, so only one patient is called at a time.
const QueueItem = ({ item, selected = false, canCall = true, onSelect, onCall, onMarkAbsent, onStart }) => {
    const called = item.status === QUEUE_STATUS.CALLED;

    return (
        <li className={cx("flex gap-3 border-b border-border px-4 py-3 transition-colors", selected ? "bg-warning-soft" : "hover:bg-surface-tint")}>
            <span
                className={cx(
                    "num grid size-9 shrink-0 place-items-center rounded-md text-body-md font-semibold",
                    selected ? "bg-warning text-on-primary" : "bg-surface-muted text-ink",
                )}
            >
                {item.queueNumber}
            </span>
            <div className="min-w-0 flex-1">
                <button
                    type="button"
                    aria-pressed={selected}
                    className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded text-left outline-none focus-visible:shadow-focus"
                    onClick={() => onSelect?.(item.id)}
                >
                    <span className="truncate font-semibold text-ink">{item.patientName}</span>
                    <StatusBadge status={item.status} labels={EXAM_QUEUE_STATUS} />
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                    {called ? (
                        <>
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
                        </>
                    ) : (
                        <button type="button" className={cx("btn btn-secondary", SMALL_BUTTON)} disabled={!canCall} onClick={() => onCall?.(item.id)}>
                            Gọi vào khám
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
};

export default QueueItem;
