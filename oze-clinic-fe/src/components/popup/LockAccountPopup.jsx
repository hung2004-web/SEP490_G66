import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { lockStaffAccount } from "@/services/staffService";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const REASON_MAX = 500;

// "Khoá tài khoản" popup: asks why before locking a staff account. onSaved(message) runs after a successful save.
const LockAccountPopup = ({ member, onClose, onSaved }) => {
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isRequiredEmpty(reason)) {
            setError(requiredMessage("lý do"));
            event.currentTarget.querySelector("textarea")?.focus();
            return;
        }

        setSaving(true);
        const response = await lockStaffAccount(member.id, { reason });
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
            description={`${member.code} · ${member.fullName}`}
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="alert alert-warning border-0">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>Nhân viên sẽ bị đăng xuất và không thể đăng nhập cho đến khi được mở khoá. Dữ liệu và lịch sử làm việc vẫn được giữ nguyên.</p>
                </div>

                <FormField id="lock-reason" label="Lý do" required error={error}>
                    <textarea
                        id="lock-reason"
                        className="input"
                        rows={3}
                        maxLength={REASON_MAX}
                        placeholder="VD: Nhân viên đã nghỉ việc từ 01/11/2026."
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "lock-reason-error" : undefined}
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setError("");
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
