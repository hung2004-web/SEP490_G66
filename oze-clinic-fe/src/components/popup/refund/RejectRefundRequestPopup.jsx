import { useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const REASON_MAX = 500;

// "Từ chối yêu cầu hoàn tiền" popup. onSubmit(reason) saves it; the parent closes the popup when that succeeds.
const RejectRefundRequestPopup = ({ request, onClose, onSubmit }) => {
    const [reason, setReason] = useState("");
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isRequiredEmpty(reason)) {
            setError(requiredMessage("lý do từ chối"));
            event.currentTarget.querySelector("textarea")?.focus();
            return;
        }

        setSaving(true);
        await onSubmit(reason.trim());
        setSaving(false);
    };

    return (
        <Modal title="Từ chối yêu cầu hoàn tiền" description={`${request.code} · ${request.patientName}`} onClose={onClose} closeDisabled={saving}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <FormField id="refund-reject-reason" label="Lý do từ chối" required error={error}>
                    <textarea
                        id="refund-reject-reason"
                        className="input"
                        rows={4}
                        maxLength={REASON_MAX}
                        placeholder="Dịch vụ đã thực hiện đầy đủ, bác sĩ xác minh không có sai sót."
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "refund-reject-reason-error" : undefined}
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setError(null);
                        }}
                    />
                </FormField>

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Từ chối
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RejectRefundRequestPopup;
