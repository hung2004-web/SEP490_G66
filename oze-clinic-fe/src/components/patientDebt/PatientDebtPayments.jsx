import DetailLink from "@/components/ui/DetailLink";
import { formatCurrency } from "@/utils/format";
import { PATIENT_DEBT_TEXT } from "@/utils/messages";
import { getPaymentHistoryRoute, getTreatmentPlanRoute } from "@/utils/routes";
import { ArrowLink, CardNote, DebtCard } from "./PatientDebtCard";

const TITLE_ID = "payment-debt-payments-title";

const ReceiptLink = ({ payment }) => (
    <DetailLink to={getPaymentHistoryRoute(payment.visitId)} context={PATIENT_DEBT_TEXT.RECEIPT_CONTEXT(payment.date, formatCurrency(payment.amount))}>
        {PATIENT_DEBT_TEXT.RECEIPT}
    </DetailLink>
);

const PatientDebtPayments = ({ item }) => (
    <DebtCard titleId={TITLE_ID} title={PATIENT_DEBT_TEXT.PAYMENTS_TITLE} aside={<CardNote>{item.payments.length}</CardNote>}>
        {item.payments.length ? (
            <>
                <div className="hidden overflow-x-auto md:block">
                    <table className="table" aria-labelledby={TITLE_ID}>
                        <thead>
                            <tr>
                                <th scope="col">{PATIENT_DEBT_TEXT.COL_DATE}</th>
                                <th scope="col">{PATIENT_DEBT_TEXT.COL_METHOD}</th>
                                <th scope="col" className="text-right">
                                    {PATIENT_DEBT_TEXT.COL_AMOUNT}
                                </th>
                                <th scope="col">
                                    <span className="sr-only">{PATIENT_DEBT_TEXT.COL_RECEIPT}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {item.payments.map((payment) => (
                                <tr key={payment.key}>
                                    <td className="whitespace-nowrap">{payment.date}</td>
                                    <td>{payment.method}</td>
                                    <td className="whitespace-nowrap text-right text-success">{formatCurrency(payment.amount)}</td>
                                    <td className="text-right">
                                        <ReceiptLink payment={payment} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul aria-labelledby={TITLE_ID} className="divide-y divide-border md:hidden">
                    {item.payments.map((payment) => (
                        <li key={payment.key} className="flex items-center justify-between gap-2 px-5 py-3">
                            <div className="min-w-0">
                                <b className="num font-semibold text-ink">{payment.date}</b>
                                <p className="text-caption text-muted">{payment.method}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <b className="num whitespace-nowrap text-success">{formatCurrency(payment.amount)}</b>
                                <ReceiptLink payment={payment} />
                            </div>
                        </li>
                    ))}
                </ul>
            </>
        ) : (
            <p className="px-5 py-4 text-muted">{PATIENT_DEBT_TEXT.NO_PAYMENT}</p>
        )}
        {item.planId != null && (
            <div className="border-t border-border px-5 py-3">
                <ArrowLink to={getTreatmentPlanRoute(item.planId)}>{PATIENT_DEBT_TEXT.VIEW_PLAN}</ArrowLink>
            </div>
        )}
    </DebtCard>
);

export default PatientDebtPayments;
