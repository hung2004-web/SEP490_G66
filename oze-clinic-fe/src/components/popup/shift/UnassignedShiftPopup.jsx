import Modal from "@/components/ui/Modal";
import { formatShiftPlace } from "@/services/shiftService";
import ShiftInfoTable from "./ShiftInfoTable";

// "Ca chưa có người trực" popup. onAssign is passed only while the shift has not started yet.
const UnassignedShiftPopup = ({ cell, onClose, onAssign }) => (
    <Modal title="Ca chưa có người trực" description={formatShiftPlace(cell)} onClose={onClose}>
        <div className="mt-5 flex flex-col gap-4">
            <ShiftInfoTable
                rows={[
                    { label: "Phòng", value: [cell.room.name, cell.room.floor].filter(Boolean).join(" · ") },
                    { label: "Giờ ca", value: <span className="num font-medium">{`${cell.start} – ${cell.end}`}</span> },
                    { label: "Người phụ trách", value: "Chưa có" },
                ]}
            />
            <p className="alert alert-danger border-0">
                Phòng này không có người trực trong ca. Lịch hẹn vào phòng này sẽ không có người tiếp nhận.
            </p>
        </div>

        <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
                Đóng
            </button>
            {onAssign && (
                <button type="button" className="btn btn-primary" onClick={() => onAssign(cell)}>
                    Phân người trực
                </button>
            )}
        </div>
    </Modal>
);

export default UnassignedShiftPopup;
