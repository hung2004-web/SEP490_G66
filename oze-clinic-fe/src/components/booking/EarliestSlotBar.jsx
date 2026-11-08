import { RefreshCw } from "lucide-react";
import { BOOKING_IDS, dayText, slotRange } from "@/utils/booking";
import { formatClock } from "@/utils/format";
import { BOOKING_TEXT } from "@/utils/messages";

const EarliestSlotBar = ({ earliest, selected, updatedAt, busy, pickBusy, onPick, onRefresh }) => (
    <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-md border border-border bg-canvas py-2 pr-2 pl-3">
        <p className="min-w-0 flex-1 basis-55 text-body-sm text-body">
            {BOOKING_TEXT.EARLIEST}{" "}
            {earliest?.slotStart && (
                <strong className="font-semibold text-ink">
                    <span className="whitespace-nowrap">{dayText(earliest.date)}</span> · <span className="num whitespace-nowrap">{slotRange(earliest.slotStart)}</span>
                </strong>
            )}
        </p>
        {earliest?.slotStart &&
            (selected ? (
                <span className="badge badge-info">{BOOKING_TEXT.PICKED}</span>
            ) : (
                <button type="button" id={BOOKING_IDS.PICK_EARLIEST} className="btn btn-secondary" aria-disabled={pickBusy || undefined} onClick={pickBusy ? undefined : onPick}>
                    {BOOKING_TEXT.PICK_EARLIEST}
                </button>
            ))}
        <span className="inline-flex items-center gap-1.5 text-caption text-muted">
            {BOOKING_TEXT.UPDATED_AT(formatClock(updatedAt))}
            <button
                type="button"
                id={BOOKING_IDS.REFRESH}
                className="btn btn-secondary btn-icon"
                aria-label={BOOKING_TEXT.REFRESH}
                aria-disabled={busy || undefined}
                onClick={busy ? undefined : onRefresh}
            >
                <RefreshCw className="size-4" aria-hidden="true" />
            </button>
        </span>
    </div>
);

export default EarliestSlotBar;
