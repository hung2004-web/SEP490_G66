import { Link } from "react-router-dom";
import { cx } from "@/utils/cx";

const BADGE_TONES = {
    warning: "badge-warning",
    info: "badge-info",
    success: "badge-success",
    danger: "badge-danger",
    neutral: "badge-neutral",
};

// One pending task tile ("Duyệt kết quả chụp", "Duyệt hoàn tiền"...), the whole tile links to where it is handled.
// badge: { label, tone }. Put the tiles in a <ul className="flex flex-col gap-3"> as <li>s.
const TaskItem = ({ icon: Icon, title, detail, badge, to }) => (
    <Link
        to={to}
        className="flex items-start gap-3 rounded-md bg-surface-muted p-3 transition-colors duration-150 hover:bg-primary-softer"
    >
        {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
            <p className="text-label font-semibold text-ink">{title}</p>
            {detail && <p className="mt-0.5 line-clamp-2 text-caption text-muted">{detail}</p>}
        </div>
        {badge && <span className={cx("badge shrink-0", BADGE_TONES[badge.tone] ?? BADGE_TONES.neutral)}>{badge.label}</span>}
    </Link>
);

export default TaskItem;
