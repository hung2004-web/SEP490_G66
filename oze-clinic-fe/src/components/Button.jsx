import { cx } from "../utils/cx";

// Variants and sizes map to the shared .btn classes in src/styles/index.css.
const VARIANTS = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    link: "btn-link",
    cta: "btn-cta",
    danger: "btn-danger",
};

const SIZES = {
    md: null,
    lg: "btn-lg",
};

const Button = ({
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    disabled = false,
    type = "button",
    className,
    children,
    ...props
}) => {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cx("btn", VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
            {...props}
        >
            {loading && <span className="btn-spinner" aria-hidden="true" />}
            {children}
        </button>
    );
};

export default Button;
