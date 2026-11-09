import { ScanLine } from "lucide-react";
import RecordStatusBadge from "@/components/medicalRecord/RecordStatusBadge";
import { displayText } from "@/utils/medicalRecord";
import { XRAY_STATUS } from "@/utils/messages";

// One X-ray order. film: { id, code, type, area, status (XRAY_STATUS key), requestedAt, thumbnailUrl? }.
const XrayItem = ({ film, onView }) => {
    const hasResult = film.status !== "requested";

    return (
        <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <span className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-navy text-on-navy-soft">
                {film.thumbnailUrl ? (
                    <img src={film.thumbnailUrl} alt="" className="size-full object-cover" />
                ) : (
                    <ScanLine className="size-6" aria-hidden="true" />
                )}
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="num font-semibold text-ink">{displayText(film.code)}</span>
                    <span className="text-body">
                        {displayText(film.type)} · {displayText(film.area)}
                    </span>
                    <RecordStatusBadge status={film.status} labels={XRAY_STATUS} />
                </div>
                <p className="text-caption text-muted">Chỉ định lúc {displayText(film.requestedAt)}</p>
            </div>
            {hasResult && onView && (
                <button type="button" className="btn btn-secondary h-8 px-3 text-caption" onClick={() => onView(film)}>
                    Xem kết quả
                </button>
            )}
        </li>
    );
};

export default XrayItem;
