import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import { getLockImpact, lockStaffAccount } from "@/services/staffService";
import { LOCK_REASON_OPTIONS, STAFF_ROLE_OPTIONS } from "@/utils/data/mockStaff";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const NOTE_MAX = 500;

const roleLabel = (role) => STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

// "Khoá tài khoản" popup: what locking affects, then the reason and a note. onSaved(message) runs after a successful save.
const LockAccountPopup = ({ member, onClose, onSaved }) => {
    const { value: impactResult } = useAsync(() => getLockImpact(member.id), [member.id]);
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const { upcomingShifts = 0, upcomingAppointments = 0 } = impactResult?.success ? impactResult.data : {};

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (!reason) nextErrors.reason = "Vui lòng chọn lý do.";
        if (isRequiredEmpty(note)) nextErrors.note = requiredMessage("ghi chú");
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const response = await lockStaffAccount(member.id, { reason, note });
        setSaving(false);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal
            title="Khoá tài khoản"
            description={`${member.fullName} · ${member.code} · ${roleLabel(member.role)}`}
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="alert alert-warning border-0">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div>
                        <p className="alert-title">Ảnh hưởng khi khoá</p>
                        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-body">
                            <li>Nhân viên không thể đăng nhập từ thời điểm khoá.</li>
                            {upcomingShifts > 0 && <li>{upcomingShifts} ca làm việc sắp tới cần phân lại.</li>}
                            {upcomingAppointments > 0 && <li>{upcomingAppointments} lịch hẹn sắp tới cần chuyển bác sĩ.</li>}
                            <li>Dữ liệu và lịch sử thao tác vẫn được lưu.</li>
                        </ul>
                    </div>
                </div>

                <FormField id="lock-reason" label="Lý do" required error={errors.reason}>
                    <select
                        id="lock-reason"
                        className="input"
                        aria-invalid={Boolean(errors.reason)}
                        aria-describedby={errors.reason ? "lock-reason-error" : undefined}
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setErrors((current) => ({ ...current, reason: undefined }));
                        }}
                    >
                        <option value="">Chọn lý do</option>
                        {LOCK_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField id="lock-note" label="Ghi chú" required error={errors.note}>
                    <textarea
                        id="lock-note"
                        className="input"
                        rows={3}
                        maxLength={NOTE_MAX}
                        placeholder="VD: Nghỉ việc từ 31/10/2026 theo quyết định số 18/QĐ-OZE."
                        aria-invalid={Boolean(errors.note)}
                        aria-describedby={errors.note ? "lock-note-error" : undefined}
                        value={note}
                        onChange={(event) => {
                            setNote(event.target.value);
                            setErrors((current) => ({ ...current, note: undefined }));
                        }}
                    />
                </FormField>

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-danger" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Khoá tài khoản
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default LockAccountPopup;
