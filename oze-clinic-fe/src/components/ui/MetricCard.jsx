import { cx } from "@/utils/cx";

const TONES = {
    positive: "text-success",
    negative: "text-danger",
    neutral: "text-muted",
};

// Report tile: icon in a tinted square, then label, a big number and a line under it (e.g. "+12% so với tuần trước").
// tone colours that line: positive (green), negative (red) or neutral. loading shows a skeleton.
const MetricCard = ({ icon: Icon, label, value, caption, tone = "neutral", loading = false }) => (
    <div className="card-app flex items-center gap-3.5 p-4.5" aria-busy={loading || undefined}>
        {Icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-softer text-primary">
                <Icon className="size-5" aria-hidden="true" />
            </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[13px] font-medium text-muted">{label}</p>
            {loading ? (
                <div aria-hidden="true">
                    <div className="skeleton mt-1 h-7 w-32" />
                    <div className="skeleton mt-2 h-3 w-24" />
                </div>
            ) : (
                <>
                    <p className="num font-heading text-heading-1 text-ink">{value}</p>
                    {caption && <p className={cx("text-caption font-normal", TONES[tone])}>{caption}</p>}
                </>
            )}
        </div>
    </div>
);

export default MetricCard;
