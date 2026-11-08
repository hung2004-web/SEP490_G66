import { Link } from "react-router-dom";
import { cx } from "@/utils/cx";

const DetailLink = ({ to, children, context, chevron = false, className, state, onClick, ...rest }) => (
    <Link to={to} state={state} onClick={onClick} className={cx("btn btn-link", className)} {...rest}>
        {children}
        {context && <span className="sr-only"> {context}</span>}
        {chevron && <span aria-hidden="true">›</span>}
    </Link>
);

export default DetailLink;
