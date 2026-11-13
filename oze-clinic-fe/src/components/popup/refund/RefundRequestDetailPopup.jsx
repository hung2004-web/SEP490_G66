import { useState } from "react";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { REFUND_REQUEST_STATUSES, REFUND_REQUEST_STATUS_LABELS } from "@/utils/data/mockRefundRequests";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { REFUND_REQUEST_ADMIN_TEXT } from "@/utils/messages";
import RejectRefundRequestPopup from "./RejectRefundRequestPopup";

const InfoPanel = ({ rows }) => (
    <dl className="flex flex-col gap-2 rounded-lg bg-surface-tint px-4 py-3">
        {rows.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium break-words text-ink">{value}</dd>
            </div>
        ))}
    </dl>
);

const TextPanel = ({ title, children }) => (
    <section>
        <h3 className="text-body-sm font-semibold text-ink">{title}</h3>
        <p className="mt-2 rounded-lg bg-surface-tint px-4 py-3 break-words text-ink">{children}</p>
    </section>
);

// "Yêu cầu hoàn tiền" popup. Only a pending request can be decided; onConfirm() and onReject(reason) save the decision and
// the parent closes the popup when that succeeds.
const RefundRequestDetailPopup = ({ request, onClose, onConfirm, onReject }) => {
    const [saving, setSaving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    const pending = request.status === REFUND_REQUEST_STATUSES.PENDING;

    const handleConfirm = async () => {
        setSaving(true);
        await onConfirm();
        setSaving(false);
    };

    return (
        <Modal
            title={
                <span className="flex flex-wrap items-center gap-2">
                    Yêu cầu hoàn tiền
                    {!pending && <StatusBadge status={request.status} labels={REFUND_REQUEST_STATUS_LABELS} />}
                </span>
            }
            description={`${request.code} · tạo bởi ${request.requestedByName} lúc ${formatDateTime(request.createdAt)}`}
            onClose={onClose}
            closeDisabled={saving}
        >
            <div className="mt-6 flex flex-col gap-4">
                <InfoPanel
                    rows={[
                        { label: "Bệnh nhân", value: `${request.patientName} · ${request.patientCode}` },
                        { label: "Bác sĩ phụ trách", value: request.doctorName },
                    ]}
                />

                <section>
                    <h3 className="mb-2 text-body-sm font-semibold text-ink">Hoá đơn cần hoàn · {request.invoiceNumber}</h3>
                    <InfoPanel
                        rows={[
                            { label: "Dịch vụ đăng ký", value: request.serviceNames },
                            { label: "Nội dung điều trị", value: request.treatmentContent },
                            { label: "Số tiền đã thanh toán", value: <span className="num">{formatCurrency(request.paidAmount)}</span> },
                            ...(Number.isFinite(request.amount)
                                ? [{ label: REFUND_REQUEST_ADMIN_TEXT.AMOUNT, value: <span className="num">{formatCurrency(request.amount)}</span> }]
                                : []),
                        ]}
                    />
                </section>

                <TextPanel title="Lý do">{request.reason}</TextPanel>
                {request.status === REFUND_REQUEST_STATUSES.REJECTED && <TextPanel title="Lý do từ chối">{request.rejectReason}</TextPanel>}

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    {pending ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-secondary border-danger-solid text-danger"
                                disabled={saving}
                                onClick={() => setRejecting(true)}
                            >
                                Từ chối
                            </button>
                            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleConfirm}>
                                {saving && <span className="btn-spinner" aria-hidden="true" />}
                                Xác nhận hoàn tiền
                            </button>
                        </>
                    ) : (
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Đóng
                        </button>
                    )}
                </div>
            </div>

            {rejecting && <RejectRefundRequestPopup request={request} onClose={() => setRejecting(false)} onSubmit={onReject} />}
        </Modal>
    );
};

export default RefundRequestDetailPopup;
