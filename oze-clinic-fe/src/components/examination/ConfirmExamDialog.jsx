import { useRef } from "react";
import Modal from "@/components/ui/Modal";
import { cx } from "@/utils/cx";

// Yes / no dialog of the exam screen (báo vắng mặt, kết thúc lượt khám). Focus starts on "Huỷ" so Enter is safe.
const ConfirmExamDialog = ({ title, description, confirmLabel, danger = false, busy = false, onConfirm, onClose }) => {
    const cancelRef = useRef(null);

    return (
        <Modal title={title} description={description} onClose={onClose} closeDisabled={busy} initialFocusRef={cancelRef}>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button ref={cancelRef} type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
                    Huỷ
                </button>
                <button type="button" className={cx("btn", danger ? "btn-danger" : "btn-primary")} disabled={busy} onClick={onConfirm}>
                    {busy && <span className="btn-spinner" aria-hidden="true" />}
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmExamDialog;
