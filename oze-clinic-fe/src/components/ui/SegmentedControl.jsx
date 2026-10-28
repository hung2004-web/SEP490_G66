import { cx } from "@/utils/cx";

// Small switch between a few options, e.g. Ngày / Tuần / Tháng / Năm. options: [{ value, label }].
const SegmentedControl = ({ options, value, onChange, label, className }) => (
    <div role="group" aria-label={label} className={cx("inline-flex rounded-md bg-surface-muted p-1", className)}>
        {options.map((option) => {
            const selected = option.value === value;
            return (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(option.value)}
                    className={cx(
                        "min-h-8 cursor-pointer rounded px-3 text-label transition-colors duration-150",
                        selected ? "bg-canvas font-semibold text-ink shadow-sm" : "text-muted hover:text-ink",
                    )}
                >
                    {option.label}
                </button>
            );
        })}
    </div>
);

export default SegmentedControl;
