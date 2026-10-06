const cx = (...classes) => classes.filter(Boolean).join(" ");

// Text input with label, required asterisk, helper and error text (docs/DESIGN.md section 6, Form controls).
const Input = ({ id, label, required = false, error, helperText, className, ...props }) => {
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const describedBy = error ? errorId : helperText ? helperId : undefined;

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
                {label}
                {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
            </label>
            <input
                id={id}
                aria-required={required || undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={cx(
                    "h-10 w-full rounded-md border bg-canvas px-3 text-body-sm text-ink placeholder:text-placeholder focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-placeholder",
                    error
                        ? "border-danger-solid focus:shadow-focus-danger"
                        : "border-line-strong focus:border-primary focus:shadow-focus"
                )}
                {...props}
            />
            {/* TODO: add the CircleAlert icon before the error once lucide-react is approved (DESIGN.md section 7). */}
            {error && (
                <p id={errorId} className="mt-1.5 text-caption text-danger">
                    {error}
                </p>
            )}
            {!error && helperText && (
                <p id={helperId} className="mt-1.5 text-caption text-muted">
                    {helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
