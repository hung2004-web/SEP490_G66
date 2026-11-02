import { Search } from "lucide-react";
import { cx } from "@/utils/cx";

// Search box with a leading icon. label is for screen readers (the placeholder says what to type).
const SearchInput = ({ id, label, placeholder, value, onChange, className }) => (
    <div className={cx("search", className)}>
        <label htmlFor={id} className="sr-only">
            {label}
        </label>
        <Search aria-hidden="true" />
        <input
            id={id}
            type="search"
            className="input"
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    </div>
);

export default SearchInput;
