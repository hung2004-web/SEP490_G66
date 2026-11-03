import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { ShiftStatusPill } from "@/components/shift/ShiftStatus";
import { SHIFT_STATUSES } from "@/utils/data/mockShifts";
import { USER_ROLES } from "@/utils/messages";
import { formatShiftPlace } from "@/services/shiftService";
import ShiftInfoTable from "./ShiftInfoTable";

const formatPhone = (phone) => phone.replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

// "2026-10-16" -> "16/10"
const dayMonth = (dateOnly) => `${dateOnly.slice(8, 10)}/${dateOnly.slice(5, 7)}`;

const actualTimes = (cell) => (cell.checkIn ? `${cell.checkIn} – ${cell.checkOut ?? "…"}` : "");

// Rows after "Trạng thái", which depend on the status.
const statusRows = (cell) => {
    if (cell.status === SHIFT_STATUSES.ABSENT) {
        return [
            { label: "Lý do vắng", value: cell.absenceReason },
            { label: "Giờ vào – ra thực tế", value: "" },
        ];
    }
    if (cell.status === SHIFT_STATUSES.LEAVE) {
        const { approvedAt, wholeDay, reason } = cell.leave;
        return [{ label: "Đơn xin nghỉ", value: `Đã duyệt ${dayMonth(approvedAt)} · ${wholeDay ? "Cả ngày" : cell.slotLabel} · ${reason}` }];
    }
    if (cell.status === SHIFT_STATUSES.PENDING) return [{ label: "Giờ vào – ra thực tế", value: "" }];
    return [
        { label: "Giờ vào – ra thực tế", value: <span className="num font-medium">{actualTimes(cell)}</span> },
        { label: "Ghi chú", value: cell.note },
    ];
};

// "Chi tiết ca" popup of an assigned shift: who works, where, and how it went (present, absent, on leave or not started).
// onViewLeave opens the leave request of a shift whose person is on leave.
const ShiftDetailPopup = ({ cell, onClose, onViewLeave }) => {
    const onLeave = cell.status === SHIFT_STATUSES.LEAVE;
    const rows = [
        { label: "Phòng", value: [cell.room.name, cell.room.floor].filter(Boolean).join(" · ") },
        { label: "Giờ ca", value: <span className="num font-medium">{`${cell.start} – ${cell.end}`}</span> },
        ...(onLeave ? [] : [{ label: "Nhiệm vụ", value: cell.task }]),
        { label: "Trạng thái", value: <ShiftStatusPill status={cell.status} /> },
        ...statusRows(cell),
    ];

    return (
        <Modal title="Chi tiết ca" description={formatShiftPlace(cell)} onClose={onClose}>
            <div className="mt-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-surface-tint px-4 py-3">
                    <Avatar fullName={cell.staff.name} />
                    <div>
                        <p className="font-semibold text-ink">{cell.staff.name}</p>
                        <p className="num text-muted">
                            {cell.staff.roleLabel} · {formatPhone(cell.staff.phone)}
                        </p>
                    </div>
                </div>

                <ShiftInfoTable rows={rows} />

                {onLeave && (
                    <p className="alert alert-warning border-0">
                        Ca này chưa có người thay.
                        {cell.staff.role === USER_ROLES.DOCTOR && " Bệnh nhân đã đặt lịch với bác sĩ này cần được báo đổi lịch."}
                    </p>
                )}
                {cell.status === SHIFT_STATUSES.PENDING && (
                    <p className="rounded-md bg-surface-tint px-4 py-3 text-muted">Trạng thái được cập nhật khi nhân viên điểm danh vào ca.</p>
                )}
            </div>

            <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
                {onLeave && (
                    <button type="button" className="btn btn-primary" onClick={() => onViewLeave(cell)}>
                        Xem đơn xin nghỉ
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default ShiftDetailPopup;
