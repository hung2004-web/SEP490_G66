import { cx } from "../utils/cx";

// Card using the shared classes in src/styles/index.css: "app" (border, no shadow) or "public" (shadow).
const VARIANTS = {
    app: "card-app",
    public: "card-public",
};

const Card = ({ variant = "app", className, children, ...props }) => {
    return (
        <div className={cx(VARIANTS[variant], className)} {...props}>
            {children}
        </div>
    );
};

export default Card;
