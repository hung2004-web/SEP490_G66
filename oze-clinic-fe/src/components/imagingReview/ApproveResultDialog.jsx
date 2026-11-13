import { useRef } from "react";
import Modal from "@/components/ui/Modal";

// "Duyệt kết quả chụp?" confirmation. subtitle: "YC000318 · X-quang toàn cảnh · Đỗ Mai Khanh". Focus starts on "Huỷ".
const ApproveResultDialog = ({ subtitle, busy = false, onConfirm, onClose }) => {
    const cancelRef = useRef(null);

    return (
        <Modal title="Duyệt kết quả chụp?" description={subtitle} onClose={onClose} closeDisabled={busy} initialFocusRef={cancelRef}>
            <p className="mt-4 rounded-lg bg-surface-tint px-3 py-2.5 font-medium text-body">Kết quả được lưu vào hồ sơ bệnh án của bệnh nhân.</p>
            <div className="-mx-5 mt-5 flex flex-wrap justify-end gap-3 border-t border-border px-5 pt-4 sm:-mx-6 sm:px-6">
                <button ref={cancelRef} type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
                    Huỷ
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={onConfirm}>
                    {busy && <span className="btn-spinner" aria-hidden="true" />}
                    Duyệt kết quả
                </button>
            </div>
        </Modal>
    );
};

export default ApproveResultDialog;
