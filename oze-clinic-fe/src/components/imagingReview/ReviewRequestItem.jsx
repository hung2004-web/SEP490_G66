import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { IMAGING_REVIEW_STATUS } from "@/utils/messages";

// One X-ray result in the review list. request: { id, patientName, code, type, time, status (IMAGING_REVIEW_STATUS key) }.
const ReviewRequestItem = ({ request, selected = false, onSelect }) => (
    <li>
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect?.(request.id)}
            className={cx(
                "flex w-full cursor-pointer gap-2.5 rounded-[10px] border p-3 text-left outline-none transition-colors focus-visible:shadow-focus",
                selected ? "border-[1.5px] border-primary bg-primary-softer" : "border-border bg-canvas hover:bg-surface-tint",
            )}
        >
            <Avatar fullName={request.patientName} className="avatar-soft shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="flex w-full items-center justify-between gap-2">
                    <span className="truncate font-semibold text-ink">{request.patientName}</span>
                    <span className="num shrink-0 text-caption text-muted">{request.time}</span>
                </span>
                <span className="text-caption text-body">
                    <span className="num">{request.code}</span> · {request.type}
                </span>
                <StatusBadge status={request.status} labels={IMAGING_REVIEW_STATUS} />
            </span>
        </button>
    </li>
);

export default ReviewRequestItem;
