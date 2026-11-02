import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import {
    deactivateService,
    deactivateServiceType,
    getDeactivationImpact,
    getServiceTypeDeactivationImpact,
} from "@/services/serviceManagementService";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const REASON_MAX = 500;

// Local date as YYYY-MM-DD, the format of <input type="date">.
const today = () => new Date().toLocaleDateString("en-CA");

// Service or service type, by the props given.
const TARGETS = {
    service: {
        title: "Ngưng hoạt động dịch vụ",
        noun: "dịch vụ",
        getImpact: getDeactivationImpact,
        deactivate: deactivateService,
    },
    type: {
        title: "Ngưng hoạt động loại dịch vụ",
        noun: "loại dịch vụ",
        getImpact: getServiceTypeDeactivationImpact,
        deactivate: deactivateServiceType,
    },
};

// "Ngưng hoạt động" popup: from which date, and why. Pass serviceType to stop one type of the service instead.
// onSaved(message) runs after a successful save.
const DeactivateServicePopup = ({ service, serviceType, onClose, onSaved }) => {
    const item = serviceType ?? service;
    const target = serviceType ? TARGETS.type : TARGETS.service;
    const { value: impactResult } = useAsync(() => target.getImpact(item.id), [target, item.id]);
    const [effectiveFrom, setEffectiveFrom] = useState(item.deactivateFrom ?? today());
    const [reason, setReason] = useState(item.deactivateReason ?? "");
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const { activeTypes = 0, upcomingAppointments = 0 } = impactResult?.success ? impactResult.data : {};

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
        const response = await target.deactivate(item.id, { effectiveFrom, reason });
        setSaving(false);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal
            title={target.title}
            description={serviceType && `${serviceType.code} · ${serviceType.name}`}
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="alert alert-warning border-0">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div className="flex flex-col gap-1">
                        <p>
                            {serviceType ? "Loại dịch vụ" : "Dịch vụ"} sẽ không còn hiển thị khi đặt lịch.
                            {upcomingAppointments > 0 &&
                                ` ${upcomingAppointments} lịch hẹn sắp tới với ${target.noun} này vẫn được giữ nguyên.`}
                        </p>
                        {activeTypes > 0 && (
                            <p className="font-semibold">
                                {activeTypes} loại dịch vụ đang hoạt động thuộc dịch vụ này cũng sẽ không thể đặt lịch.
                            </p>
                        )}
                    </div>
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
