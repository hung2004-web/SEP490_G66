import { cx } from "@/utils/cx";

// Clickable stat tile (label + number), used as a quick filter. value undefined = still loading.
const StatCard = ({ label, value, active, onClick }) => (
    <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cx(
            "card-app flex cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-150 hover:border-primary",
            active && "border-primary bg-primary-softer",
        )}
    >
        <span className="stat-label">{label}</span>
        {value === undefined ? (
            <span className="skeleton h-7 w-8" aria-hidden="true" />
        ) : (
            <span className="num font-heading text-heading-2 text-ink">{value}</span>
        )}
    </button>
);

export default StatCard;
