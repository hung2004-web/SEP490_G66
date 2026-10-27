import { Link } from "react-router-dom";
import { cx } from "@/utils/cx";

const DetailLink = ({ to, children, context, chevron = false, className }) => (
    <Link to={to} className={cx("btn btn-link", className)}>
        {children}
        {context && <span className="sr-only"> {context}</span>}
        {chevron && <span aria-hidden="true">›</span>}
    </Link>
);

export default DetailLink;
