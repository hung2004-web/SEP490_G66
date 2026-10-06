import { cx } from "../utils/cx";

// Text input with label, required asterisk, help and error text (shared .field classes in src/styles/index.css).
// `required` only sets aria-required, not the native attribute, so the browser never shows its own validation popup.
const Input = ({ id, label, required = false, error, helpText, className, ...props }) => {
    const errorId = `${id}-error`;
    const helpId = `${id}-help`;
    const describedBy = error ? errorId : helpText ? helpId : undefined;

    return (
        <div className={cx("field", className)}>
            <label htmlFor={id} className={cx("label", required && "label-required")}>
                {label}
            </label>
            <input
                id={id}
                className="input"
                aria-required={required || undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...props}
            />
            {/* TODO: add the CircleAlert icon before the error once lucide-react is approved (DESIGN.md section 7). */}
            {error && (
                <p id={errorId} className="error-text">
                    {error}
                </p>
            )}
            {!error && helpText && (
                <p id={helpId} className="help-text">
                    {helpText}
                </p>
            )}
        </div>
    );
};

export default Input;
