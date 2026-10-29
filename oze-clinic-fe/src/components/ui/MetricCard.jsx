import { cx } from "@/utils/cx";

const TONES = {
    positive: "text-success",
    negative: "text-danger",
    neutral: "text-muted",
};

// Report tile: icon + label, a big number and a line under it (e.g. "+12% so với tuần trước").
// tone colours that line: positive (green), negative (red) or neutral. loading shows a skeleton.
const MetricCard = ({ icon: Icon, label, value, caption, tone = "neutral", loading = false }) => (
    <div className="card-app flex flex-col gap-1 p-4" aria-busy={loading || undefined}>
        <p className="flex items-center gap-2 text-caption text-muted">
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            {label}
        </p>
        {loading ? (
            <div aria-hidden="true">
                <div className="skeleton mt-1 h-8 w-32" />
                <div className="skeleton mt-2 h-3 w-24" />
            </div>
        ) : (
            <>
                <p className="num font-heading text-stat text-ink">{value}</p>
                {caption && <p className={cx("text-caption", TONES[tone])}>{caption}</p>}
            </>
        )}
    </div>
);

export default MetricCard;
