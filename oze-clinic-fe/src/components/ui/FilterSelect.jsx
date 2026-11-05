import { cx } from "@/utils/cx";

// Compact filter dropdown that names itself in the box: "Vai trò: Tất cả", "Vai trò: Bác sĩ".
// options: [{ value, label }]; "" is the "Tất cả" choice. className replaces the default width, which fits the longest option.
const FilterSelect = ({ id, label, options, value, onChange, allLabel = "Tất cả", className = "w-auto min-w-40" }) => (
    <select
        id={id}
        className={cx("input", className)}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
    >
        <option value="">
            {label}: {allLabel}
        </option>
        {options.map((option) => (
            <option key={option.value} value={option.value}>
                {label}: {option.label}
            </option>
        ))}
    </select>
);

export default FilterSelect;
