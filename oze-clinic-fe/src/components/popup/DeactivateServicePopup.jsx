import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import { deactivateService, getUpcomingAppointmentCount } from "@/services/serviceManagementService";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const REASON_MAX = 500;

// Local date as YYYY-MM-DD, the format of <input type="date">.
const today = () => new Date().toLocaleDateString("en-CA");

// "Ngưng hoạt động dịch vụ" popup: from which date, and why. onSaved(message) runs after a successful save.
const DeactivateServicePopup = ({ service, onClose, onSaved }) => {
    const { value: countResult } = useAsync(() => getUpcomingAppointmentCount(service.id), [service.id]);
    const [effectiveFrom, setEffectiveFrom] = useState(service.deactivateFrom ?? today());
    const [reason, setReason] = useState(service.deactivateReason ?? "");
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const upcomingCount = countResult?.success ? countResult.data.count : 0;

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (!effectiveFrom) nextErrors.effectiveFrom = requiredMessage("ngày ngưng áp dụng");
        else if (effectiveFrom < today()) nextErrors.effectiveFrom = "Ngày ngưng áp dụng không được trước hôm nay.";
        if (isRequiredEmpty(reason)) nextErrors.reason = requiredMessage("lý do");
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const response = await deactivateService(service.id, { effectiveFrom, reason });
        setSaving(false);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal title="Ngưng hoạt động dịch vụ" onClose={onClose} closeDisabled={saving}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="alert alert-warning border-0">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>
                        Dịch vụ sẽ không còn hiển thị khi đặt lịch.
                        {upcomingCount > 0 &&
                            ` ${upcomingCount} lịch hẹn sắp tới với dịch vụ này vẫn được giữ nguyên.`}
                    </p>
                </div>

                <FormField id="deactivate-from" label="Ngưng áp dụng từ" required error={errors.effectiveFrom}>
                    <input
                        id="deactivate-from"
                        type="date"
                        className="input"
                        min={today()}
                        aria-invalid={Boolean(errors.effectiveFrom)}
                        aria-describedby={errors.effectiveFrom ? "deactivate-from-error" : undefined}
                        value={effectiveFrom}
                        onChange={(event) => {
                            setEffectiveFrom(event.target.value);
                            setErrors((current) => ({ ...current, effectiveFrom: undefined }));
                        }}
                    />
                </FormField>

                <FormField id="deactivate-reason" label="Lý do" required error={errors.reason}>
                    <textarea
                        id="deactivate-reason"
                        className="input"
                        rows={3}
                        maxLength={REASON_MAX}
                        placeholder="VD: Hết hợp đồng cung cấp vật tư, tạm ngừng đến khi có nhà cung cấp mới."
                        aria-invalid={Boolean(errors.reason)}
                        aria-describedby={errors.reason ? "deactivate-reason-error" : undefined}
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setErrors((current) => ({ ...current, reason: undefined }));
                        }}
                    />
                </FormField>

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-danger" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Ngưng hoạt động
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DeactivateServicePopup;
