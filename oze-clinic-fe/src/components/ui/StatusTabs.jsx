import { cx } from "@/utils/cx";

// One-click status filter: a row of buttons instead of a dropdown ("Tất cả 12", "Chờ xác nhận 3", "Đã hủy 2").
// Same props as FilterSelect so it swaps in: options [{ value, label, tone? }], "" is "Tất cả".
// counts (optional): { [value]: n, "": total }, shown on each button when the page knows them.
// tone: the badge class of the status (badge-warning, badge-success...), drawn as a coloured dot.

const DOT = {
    "badge-warning": "bg-warning-solid",
    "badge-success": "bg-success-solid",
    "badge-info": "bg-primary",
    "badge-danger": "bg-danger-solid",
    "badge-neutral": "bg-border-strong",
};

const StatusTabs = ({ label, options, value, onChange, allLabel = "Tất cả", counts, className }) => {
    const all = [{ value: "", label: allLabel }, ...options];
    return (
        <div role="group" aria-label={label} className={cx("flex max-w-full flex-wrap gap-1.5", className)}>
            {all.map((option) => {
                const active = value === option.value;
                const count = counts ? (counts[option.value] ?? 0) : undefined;
                return (
                    <button
                        key={option.value || "all"}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={cx(
                            "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-body-sm whitespace-nowrap transition-colors",
                            active ? "border-primary bg-primary text-on-primary" : "border-border bg-canvas text-ink hover:border-primary hover:text-primary",
                            !active && count === 0 && "opacity-60",
                        )}
                    >
                        {option.tone && <i aria-hidden className={cx("size-2 rounded-full", active ? "bg-white" : (DOT[option.tone] ?? "bg-border-strong"))} />}
                        {option.label}
                        {count !== undefined && (
                            <span className={cx("num rounded-full px-1.5 text-caption font-semibold", active ? "bg-white/20" : "bg-surface-muted text-muted")}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default StatusTabs;
