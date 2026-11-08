import DetailLink from "@/components/ui/DetailLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { REFUND_REQUEST_STATUS_LABELS } from "@/utils/data/mockRefundRequests";
import { formatCurrency } from "@/utils/format";
import { CLINIC_HOTLINE, PATIENT_DEBT_TEXT } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";
import { ArrowLink, DebtCard } from "./PatientDebtCard";

const TITLE_ID = "payment-debt-refunds-title";

const PatientDebtRefunds = ({ item }) => (
    <DebtCard titleId={TITLE_ID} title={PATIENT_DEBT_TEXT.REFUNDS_TITLE} aside={<ArrowLink to={ROUTES.REFUND_REQUESTS}>{PATIENT_DEBT_TEXT.ALL_REFUNDS}</ArrowLink>}>
        {item.refunds.length ? (
            <ul aria-labelledby={TITLE_ID} className="divide-y divide-border">
                {item.refunds.map((refund) => (
                    <li key={refund.code} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                            <p className="font-semibold text-ink">
                                {PATIENT_DEBT_TEXT.REFUND_HEAD(refund.code)}
                                <span className="num">{formatCurrency(refund.amount)}</span>
                            </p>
                            <p className="num mt-0.5 text-caption">{PATIENT_DEBT_TEXT.REFUND_META(refund.stage, refund.visitDate, refund.createdAt)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={refund.status} labels={REFUND_REQUEST_STATUS_LABELS} />
                            <DetailLink to={ROUTES.REFUND_REQUESTS} context={PATIENT_DEBT_TEXT.REFUND_CONTEXT(refund.code)}>
                                {PATIENT_DEBT_TEXT.VIEW}
                            </DetailLink>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="px-5 py-4 text-muted">{PATIENT_DEBT_TEXT.NO_REFUND}</p>
        )}
        <p className="border-t border-border px-5 py-3 text-caption text-muted">
            {PATIENT_DEBT_TEXT.CONTACT_BEFORE}
            <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="font-semibold text-primary hover:underline">
                {CLINIC_HOTLINE.DISPLAY}
            </a>
            {PATIENT_DEBT_TEXT.CONTACT_AFTER}
        </p>
    </DebtCard>
);

export default PatientDebtRefunds;
