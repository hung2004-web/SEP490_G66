import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";
import { REFUND_REQUEST_TEXT } from "@/utils/messages";
import { REFUND_REQUEST_STATUS_LABELS, clinicDate, clinicDateTime, forWhatText, processSteps } from "@/utils/refundRequest";
import { getPaymentHistoryRoute } from "@/utils/routes";

const DOT_CLASS = {
    done: "bg-success-solid text-on-primary",
    current: "border-2 border-primary bg-primary-soft",
    error: "bg-danger-solid text-on-primary",
    todo: "border-2 border-border-strong bg-canvas",
};

const RefundRequestDetailModal = ({ request, code, closeButtonRef, onClose }) => {
    if (!request) {
        return (
            <Modal title={REFUND_REQUEST_TEXT.NOT_FOUND_TITLE} onClose={onClose} initialFocusRef={closeButtonRef} closeButtonRef={closeButtonRef}>
                <p className="mt-3">{REFUND_REQUEST_TEXT.NOT_FOUND_TEXT(code)}</p>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {REFUND_REQUEST_TEXT.CLOSE}
                    </button>
                </div>
            </Modal>
        );
    }

    const forWhat = forWhatText(request);
    const hasForWhat = forWhat !== REFUND_REQUEST_TEXT.NO_VALUE && request.visitId != null;

    return (
        <Modal
            title={REFUND_REQUEST_TEXT.DETAIL_TITLE(request.code)}
            description={REFUND_REQUEST_TEXT.DETAIL_SENT(clinicDateTime(request.createdAt))}
            onClose={onClose}
            initialFocusRef={closeButtonRef}
            closeButtonRef={closeButtonRef}
        >
            <div className="mt-3">
                <StatusBadge status={request.status} labels={REFUND_REQUEST_STATUS_LABELS} />
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
                <dt className="text-muted">{REFUND_REQUEST_TEXT.FOR}</dt>
                <dd className="sm:col-span-2">
                    {hasForWhat ? (
                        <Link to={getPaymentHistoryRoute(request.visitId)} className="inline-flex min-h-6 items-center text-primary hover:underline">
                            {forWhat}
                        </Link>
                    ) : (
                        forWhat
                    )}
                </dd>
                <dt className="text-muted">{REFUND_REQUEST_TEXT.PAID_AT}</dt>
                <dd className="num sm:col-span-2">{clinicDate(request.paidAt)}</dd>
                <dt className="text-muted">{REFUND_REQUEST_TEXT.DOCTOR}</dt>
                <dd className="sm:col-span-2">{request.doctorName ?? REFUND_REQUEST_TEXT.NO_VALUE}</dd>
                <dt className="text-muted">{REFUND_REQUEST_TEXT.AMOUNT}</dt>
                <dd className="num font-semibold text-ink sm:col-span-2">{formatCurrency(request.amount)}</dd>
                <dt className="text-muted">{REFUND_REQUEST_TEXT.REASON}</dt>
                <dd className="break-words sm:col-span-2">{request.reason}</dd>
            </dl>
            <p className="mb-2 mt-5 text-caption text-muted">{REFUND_REQUEST_TEXT.PROCESS}</p>
            <ol className="flex flex-col gap-3">
                {processSteps(request).map((step) => (
                    <li key={step.key} className="flex gap-3">
                        <span className={cx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", DOT_CLASS[step.state])} aria-hidden="true">
                            {step.state === "done" && <Check className="size-3" />}
                            {step.state === "error" && <X className="size-3" />}
                        </span>
                        <div>
                            <p className="font-semibold text-ink">
                                {step.title} <span className="num font-normal text-muted">· {step.time}</span>
                            </p>
                            <p className="text-caption">{step.text}</p>
                            <span className="sr-only">{REFUND_REQUEST_TEXT.STEP_STATE[step.state]}</span>
                        </div>
                    </li>
                ))}
            </ol>
        </Modal>
    );
};

export default RefundRequestDetailModal;
