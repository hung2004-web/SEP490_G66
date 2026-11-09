import { Search } from "lucide-react";
import { ArrowLink } from "@/components/patientDebt/PatientDebtCard";
import { PAYMENT_HISTORY_TEXT } from "@/utils/messages";
import { HISTORY_RECEIPT_TITLE_ID } from "@/utils/paymentHistory";
import { getMedicalRecordDetailRoute } from "@/utils/routes";
import PaymentReceiptPaper from "./PaymentReceiptPaper";

const TITLE_CLASS = "scroll-mt-topbar outline-none focus-visible:shadow-none";

const PaymentReceipt = ({ receipt, profile, missing, titleRef, onShowLatest }) => {
    if (missing) {
        return (
            <section className="card-app p-0">
                <div className="empty-state">
                    <Search className="empty-state-icon" aria-hidden="true" />
                    <h2 id={HISTORY_RECEIPT_TITLE_ID} ref={titleRef} tabIndex={-1} className={`empty-state-title ${TITLE_CLASS}`}>
                        {PAYMENT_HISTORY_TEXT.NOT_FOUND_TITLE}
                    </h2>
                    <p className="empty-state-text">{PAYMENT_HISTORY_TEXT.NOT_FOUND_TEXT}</p>
                    <button type="button" className="btn btn-secondary mt-3 h-8 px-3" onClick={onShowLatest}>
                        {PAYMENT_HISTORY_TEXT.SHOW_LATEST}
                    </button>
                </div>
            </section>
        );
    }
    if (!receipt) return null;
    return (
        <section className="card-app p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                    <h2 id={HISTORY_RECEIPT_TITLE_ID} ref={titleRef} tabIndex={-1} className={`card-title ${TITLE_CLASS}`}>
                        {PAYMENT_HISTORY_TEXT.RECEIPT_TITLE(receipt.no)}
                    </h2>
                    <p className="num text-caption font-medium text-muted">{receipt.date}</p>
                </div>
                <ArrowLink to={getMedicalRecordDetailRoute(receipt.id)}>
                    {PAYMENT_HISTORY_TEXT.MEDICAL_RECORD}
                    <span className="sr-only">{PAYMENT_HISTORY_TEXT.MEDICAL_RECORD_CONTEXT(receipt.no)}</span>
                </ArrowLink>
            </div>
            <div className="px-5 py-4">
                <PaymentReceiptPaper receipt={receipt} profile={profile} />
            </div>
        </section>
    );
};

export default PaymentReceipt;
