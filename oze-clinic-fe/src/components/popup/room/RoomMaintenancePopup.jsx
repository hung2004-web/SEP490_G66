import { useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { setRoomMaintenance } from "@/services/roomService";
import { ROOM_STATUSES } from "@/utils/data/mockRooms";

// Confirms starting or ending maintenance for a room. onSaved(message) runs after a successful save.
const RoomMaintenancePopup = ({ room, onClose, onSaved }) => {
    const confirmRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const startMaintenance = room.status !== ROOM_STATUSES.MAINTENANCE;

    const handleConfirm = async () => {
        setSaving(true);
        const result = await setRoomMaintenance(room.id, startMaintenance);
        setSaving(false);
        if (!result.success) {
            setError(result.errors?.form);
            return;
        }
        onSaved(result.message);
    };

    return (
        <Modal
            size="sm"
            title={startMaintenance ? "Chuyển sang bảo trì?" : "Kết thúc bảo trì?"}
            onClose={onClose}
            initialFocusRef={confirmRef}
            closeDisabled={saving}
        >
            <p className="mt-3">
                {startMaintenance ? (
                    <>
                        Phòng <strong className="text-ink">{room.code} – {room.name}</strong> sẽ không được xếp lịch cho đến khi
                        kết thúc bảo trì.
                    </>
                ) : (
                    <>
                        Phòng <strong className="text-ink">{room.code} – {room.name}</strong> sẽ chuyển về trạng thái Sẵn sàng.
                    </>
                )}
            </p>
            {error && (
                <p role="alert" className="alert alert-danger mt-4">
                    {error}
                </p>
            )}
            <div className="modal-actions">
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                    Hủy
                </button>
                <button ref={confirmRef} type="button" className="btn btn-primary" disabled={saving} onClick={handleConfirm}>
                    {saving && <span className="btn-spinner" aria-hidden="true" />}
                    {startMaintenance ? "Chuyển sang bảo trì" : "Kết thúc bảo trì"}
                </button>
            </div>
        </Modal>
    );
};

export default RoomMaintenancePopup;
