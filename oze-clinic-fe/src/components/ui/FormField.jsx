import { cx } from "@/utils/cx";

// Label + control + error text. Give the control id={id} and aria-describedby={`${id}-error`} when there is an error.
const FormField = ({ id, label, required, error, children }) => (
    <div className="field">
        <label htmlFor={id} className={cx("label", required && "label-required")}>
            {label}
        </label>
        {children}
        {error && (
            <p id={`${id}-error`} className="error-text">
                {error}
            </p>
        )}
    </div>
);

export default FormField;
