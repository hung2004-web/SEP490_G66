const cx = (...classes) => classes.filter(Boolean).join(" ");

// Inline alert from docs/DESIGN.md section 6 (Feedback): soft semantic background, 1px semantic border, text.
const VARIANTS = {
    danger: "border-danger-solid bg-danger-soft text-danger",
    warning: "border-warning-solid bg-warning-soft text-warning",
    success: "border-success-solid bg-success-soft text-success",
    info: "border-primary bg-primary-soft text-primary",
};

const Alert = ({ variant = "info", className, children }) => {
    const isUrgent = variant === "danger" || variant === "warning";

    return (
        <div
            role={isUrgent ? "alert" : "status"}
            className={cx("rounded-md border px-4 py-3 text-body-sm", VARIANTS[variant], className)}
        >
            {/* TODO: add the semantic icon once lucide-react is approved (DESIGN.md section 7). */}
            {children}
        </div>
    );
};

export default Alert;
