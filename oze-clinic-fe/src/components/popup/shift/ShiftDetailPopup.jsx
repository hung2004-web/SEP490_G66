import { Link } from "react-router-dom";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { ShiftStatusPill } from "@/components/shift/ShiftStatus";
import { LEAVE_REQUEST_STATUS_LABELS, SHIFT_STATUSES } from "@/utils/data/mockShifts";
import { formatShiftPlace } from "@/services/shiftService";
import { formatPhone } from "@/utils/format";
import { ROUTES } from "@/utils/routes";
import ShiftInfoTable from "./ShiftInfoTable";

const actualTimes = (cell) => (cell.checkIn ? `${cell.checkIn} – ${cell.checkOut ?? "…"}` : "");

// TODO: point at the request's own page once "Đơn xin nghỉ" is built.
const leaveRequestUrl = (requestId) => `${ROUTES.ADMIN_LEAVE_REQUESTS}?id=${requestId}`;

// Rows after "Trạng thái", which depend on the status.
const statusRows = (cell) => {
    if (cell.status === SHIFT_STATUSES.ABSENT) {
        return [
            { label: "Lý do vắng", value: cell.absenceReason },
            { label: "Giờ vào – ra thực tế", value: "" },
        ];
    }
    if (cell.status === SHIFT_STATUSES.LEAVE) {
        return [
            {
                label: "Đơn xin nghỉ",
                value: (
                    <span className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge status={cell.leave.status} labels={LEAVE_REQUEST_STATUS_LABELS} />
                        <Link to={leaveRequestUrl(cell.leave.requestId)} className="btn btn-link h-auto p-0 text-caption font-semibold">
                            Xem chi tiết đơn
                        </Link>
                    </span>
                ),
            },
        ];
    }
    if (cell.status === SHIFT_STATUSES.PENDING) return [{ label: "Giờ vào – ra thực tế", value: "" }];
    return [{ label: "Giờ vào – ra thực tế", value: <span className="num font-medium">{actualTimes(cell)}</span> }];
};

// "Chi tiết ca" popup of an assigned shift: who works, where, and how it went (present, absent, on leave or not started).
// A shift whose person is on leave shows the leave request's status with a link to the request.
// onAssign(cell) opens "Chọn người thay" for that shift; pass it only while the shift has not started.
const ShiftDetailPopup = ({ cell, onClose, onAssign }) => {
    const onLeave = cell.status === SHIFT_STATUSES.LEAVE;
    const rows = [
        { label: "Phòng", value: [cell.room.name, cell.room.floor].filter(Boolean).join(" · ") },
        { label: "Giờ ca", value: <span className="num font-medium">{`${cell.start} – ${cell.end}`}</span> },
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

                {cell.status === SHIFT_STATUSES.PENDING && (
                    <p className="rounded-md bg-surface-tint px-4 py-3 text-muted">Trạng thái được cập nhật khi nhân viên điểm danh vào ca.</p>
                )}
            </div>

            <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
                {onLeave && onAssign && (
                    <button type="button" className="btn btn-primary" onClick={() => onAssign(cell)}>
                        Phân ca
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default ShiftDetailPopup;
