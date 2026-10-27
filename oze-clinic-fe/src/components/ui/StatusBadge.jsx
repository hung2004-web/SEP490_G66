import { cx } from "@/utils/cx";

const StatusBadge = ({ status, labels }) => {
    const meta = Object.hasOwn(labels, status) ? labels[status] : null;
    return meta ? <span className={cx("badge", meta.badge)}>{meta.label}</span> : null;
};

export default StatusBadge;
