const cx = (...classes) => classes.filter(Boolean).join(" ");

// Variants and sizes from docs/DESIGN.md section 6 (Buttons).
const VARIANTS = {
    primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active focus-visible:shadow-focus",
    secondary: "border border-primary bg-canvas text-primary hover:bg-primary-softer active:bg-primary-soft focus-visible:shadow-focus",
    tertiary: "border border-line-strong bg-canvas text-ink hover:bg-surface-tint active:bg-surface-muted focus-visible:shadow-focus",
    ghost: "bg-transparent text-primary hover:bg-primary-softer active:bg-primary-soft focus-visible:shadow-focus",
    danger: "bg-danger-solid text-white hover:bg-danger active:bg-danger focus-visible:shadow-focus-danger",
};

const SIZES = {
    sm: "h-8 px-3",
    md: "h-10 px-4",
    lg: "h-12 px-7",
};

const DISABLED = "cursor-not-allowed bg-surface-muted text-placeholder";

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
    const isInactive = disabled && !loading;

    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cx(
                "relative inline-flex items-center justify-center rounded-md text-sm font-semibold leading-none focus-visible:outline-none",
                SIZES[size],
                isInactive ? DISABLED : VARIANTS[variant],
                loading && "cursor-wait",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            {/* The label stays in the layout while loading so the button keeps its width. */}
            <span className={cx("inline-flex items-center gap-2", loading && "opacity-0")}>
                {children}
            </span>
            {loading && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                </span>
            )}
        </button>
    );
};

export default Button;
