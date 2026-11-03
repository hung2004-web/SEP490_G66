import Modal from "@/components/ui/Modal";

// "48" + "giờ" -> "48 giờ"; a time stays "08:00".
const formatValue = (config, value) => (config.unit ? `${value} ${config.unit}` : value);

// "Lưu cấu hình?" confirmation listing the new values. changes: [{ config, value }] (config as in ConfigSection).
// onConfirm runs on "Lưu cấu hình"; saving locks the popup while the save is in progress.
const SaveConfigPopup = ({ changes, saving = false, onClose, onConfirm }) => (
    <Modal title="Lưu cấu hình?" onClose={onClose} closeDisabled={saving}>
        <div className="table-wrap mt-5">
            <table className="table">
                <thead>
                    <tr>
                        <th scope="col">Cấu hình</th>
                        <th scope="col" className="w-32">
                            Mới
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {changes.map(({ config, value }) => (
                        <tr key={config.key}>
                            <td>{config.label}</td>
                            <td className="num font-semibold text-ink">{formatValue(config, value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                Quay lại
            </button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={onConfirm}>
                {saving ? "Đang lưu…" : "Lưu cấu hình"}
            </button>
        </div>
    </Modal>
);

export default SaveConfigPopup;
