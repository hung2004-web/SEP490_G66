import { useId, useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";

// "Yêu cầu chụp lại" with a required reason. subtitle: "YC000318 · X-quang toàn cảnh · Đỗ Mai Khanh".
// onSubmit receives the trimmed reason.
const RetakeRequestDialog = ({ subtitle, busy = false, onSubmit, onClose }) => {
    const reasonId = useId();
    const [reason, setReason] = useState("");
    const [error, setError] = useState(null);

    const handleSubmit = (event) => {
        event.preventDefault();
        const value = reason.trim();
        if (!value) {
            setError("Nhập lý do chụp lại.");
            return;
        }
        onSubmit(value);
    };

    return (
        <Modal title="Yêu cầu chụp lại" description={subtitle} onClose={onClose} closeDisabled={busy}>
            <form noValidate onSubmit={handleSubmit} className="mt-4">
                <FormField id={reasonId} label="Lý do" required error={error}>
                    <textarea
                        id={reasonId}
                        className="input"
                        placeholder="Ví dụ: Ảnh mờ vùng răng hàm dưới trái, cần chụp lại chân răng 37–38."
                        value={reason}
                        disabled={busy}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${reasonId}-error` : undefined}
                        onChange={(event) => {
                            setReason(event.target.value);
                            if (error) setError(null);
                        }}
                    />
                </FormField>
                <div className="-mx-5 mt-5 flex flex-wrap justify-end gap-3 border-t border-border px-5 pt-4 sm:-mx-6 sm:px-6">
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy && <span className="btn-spinner" aria-hidden="true" />}
                        Gửi yêu cầu chụp lại
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RetakeRequestDialog;
