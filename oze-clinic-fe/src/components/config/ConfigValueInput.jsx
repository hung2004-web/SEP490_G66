import { cx } from "@/utils/cx";

// Kinds of value a system setting can hold.
const DATA_TYPES = {
    INT: "int",
    TIME: "time",
};

// Value field of one setting. config: { key, label, dataType: "int" | "time", unit?, min?, max? }.
// An int shows its unit ("ngày", "giờ", "phút") inside the box; a time is "HH:mm". value is always a string.
const ConfigValueInput = ({ id, config, value, onChange, invalid = false, describedBy }) => {
    const shared = {
        id,
        value,
        "aria-label": config.label,
        "aria-invalid": invalid || undefined,
        "aria-describedby": describedBy,
        onChange: (event) => onChange(event.target.value),
    };

    if (config.dataType === DATA_TYPES.TIME) {
        return <input {...shared} type="time" className="input num" />;
    }

    return (
        <div className="relative">
            <input
                {...shared}
                type="number"
                inputMode="numeric"
                step={1}
                min={config.min}
                max={config.max}
                className={cx("input num", config.unit && "pr-14")}
            />
            {config.unit && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted" aria-hidden="true">
                    {config.unit}
                </span>
            )}
        </div>
    );
};

export default ConfigValueInput;
