import RecordStatusBadge from "@/components/medicalRecord/RecordStatusBadge";
import { XRAY_STATUS } from "@/utils/messages";

const subtitle = (film) => {
    const when = film.status === "requested" ? `Gửi lúc ${film.sentAt} · chờ KTV` : film.visitDate ? `Lần khám ${film.visitDate}` : `Gửi lúc ${film.sentAt}`;
    return [when, film.purpose].filter(Boolean).join(" · ");
};

// One X-ray order. film: { id, code, type, area, purpose, status (XRAY_STATUS key), sentAt?, visitDate? }.
// Until the technician uploads the image there is no thumbnail and nothing to open.
const XrayItem = ({ film, onView }) => {
    const hasImage = film.status !== "requested";

    return (
        <li className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border p-3">
            {hasImage ? (
                <button
                    type="button"
                    className="grid h-16 w-12 shrink-0 cursor-pointer place-items-center rounded-md bg-surface-navy text-[10px] text-on-navy-soft outline-none focus-visible:shadow-focus"
                    aria-label={`Xem lớn ảnh ${film.code}`}
                    onClick={() => onView?.(film)}
                >
                    Xem lớn
                </button>
            ) : (
                <span className="grid h-16 w-12 shrink-0 place-items-center rounded-md border border-dashed border-border-strong bg-surface-tint text-center text-[10px] leading-tight text-placeholder">
                    Chưa có ảnh
                </span>
            )}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">
                        <span className="num">{film.code}</span> · {film.type} · {film.area}
                    </span>
                    <RecordStatusBadge status={film.status} labels={XRAY_STATUS} />
                </div>
                <p className="text-caption text-muted">{subtitle(film)}</p>
            </div>
            {hasImage && onView && (
                <button type="button" className="btn btn-secondary" onClick={() => onView(film)}>
                    Xem chi tiết
                </button>
            )}
        </li>
    );
};

export default XrayItem;
