import { ArrowLink } from "@/components/patientDebt/PatientDebtCard";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";
import { PAYMENT_HISTORY_TEXT } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const SummaryCard = ({ label, value, valueClassName, children }) => (
    <div className="card-app px-5 py-4">
        <p className="text-caption font-medium text-muted">{label}</p>
        <p className={cx("num mt-0.5 font-heading text-heading-1", valueClassName)}>{formatCurrency(value)}</p>
        <div className="mt-0.5 text-caption text-muted">{children}</div>
    </div>
);

const PaymentHistorySummary = ({ totals, count }) => (
    <section className="mb-4 grid gap-4 md:grid-cols-3">
        <SummaryCard label={PAYMENT_HISTORY_TEXT.SUM_NET} value={totals.net} valueClassName="text-ink">
            {PAYMENT_HISTORY_TEXT.SUM_NET_SUB(count)}
        </SummaryCard>
        <SummaryCard label={PAYMENT_HISTORY_TEXT.SUM_PAID} value={totals.paid} valueClassName="text-success">
            {PAYMENT_HISTORY_TEXT.SUM_PAID_SUB(totals.payments)}
        </SummaryCard>
        <SummaryCard label={PAYMENT_HISTORY_TEXT.SUM_LEFT} value={totals.left} valueClassName="text-ink">
            <ArrowLink to={ROUTES.PAYMENT_DEBTS}>{totals.left > 0 ? PAYMENT_HISTORY_TEXT.SUM_LEFT_LINK : PAYMENT_HISTORY_TEXT.SUM_LEFT_LINK_ZERO}</ArrowLink>
        </SummaryCard>
    </section>
);

export default PaymentHistorySummary;
