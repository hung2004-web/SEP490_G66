import { cx } from "../utils/cx";

// Inline alert using the shared .alert classes in src/styles/index.css. tone: info, success, warning, danger.
const Alert = ({ tone = "info", title, className, children }) => {
    const isUrgent = tone === "danger" || tone === "warning";

    return (
        <div role={isUrgent ? "alert" : "status"} className={cx("alert", `alert-${tone}`, className)}>
            {/* TODO: add the semantic icon once lucide-react is approved (DESIGN.md section 7). */}
            <div>
                {title && <p className="alert-title">{title}</p>}
                {children}
            </div>
        </div>
    );
};

export default Alert;
