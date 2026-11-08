import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cx } from "@/utils/cx";
import { REFUND_REQUEST_STATUS_LABELS } from "@/utils/data/mockRefundRequests";
import { PATIENT_DEBT_TEXT } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

export const DebtCard = ({ titleId, title, aside, children }) => (
    <section className="card-app p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 id={titleId} className="card-title">
                {title}
            </h2>
            {aside}
        </div>
        {children}
    </section>
);

export const CardNote = ({ children }) => <span className="num text-caption text-muted">{children}</span>;

export const ArrowLink = ({ to, children, className }) => (
    <Link to={to} className={cx("inline-flex min-h-6 items-center gap-1 text-caption font-medium text-primary hover:underline", className)}>
        {children}
        <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
);

export const RefundLink = ({ refund }) =>
    refund ? (
        <Link to={ROUTES.REFUND_REQUESTS} className="inline-flex min-h-6 items-center text-caption font-medium text-primary hover:underline">
            {PATIENT_DEBT_TEXT.REFUND_LINK(refund.code, REFUND_REQUEST_STATUS_LABELS[refund.status]?.label ?? "—")}
        </Link>
    ) : null;
