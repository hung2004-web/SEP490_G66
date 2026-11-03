import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import MonthlyShiftPopup from "@/components/popup/shift/MonthlyShiftPopup";
import ShiftAssignPopup from "@/components/popup/shift/ShiftAssignPopup";
import ShiftDetailPopup from "@/components/popup/shift/ShiftDetailPopup";
import ShiftEditPopup from "@/components/popup/shift/ShiftEditPopup";
import UnassignedShiftPopup from "@/components/popup/shift/UnassignedShiftPopup";
import ShiftWeekGrid from "@/components/shift/ShiftWeekGrid";
import FilterSelect from "@/components/ui/FilterSelect";
import useAsync from "@/hooks/useAsync";
import { SHIFT_ROLE_OPTIONS, copyPreviousWeek, getWeekOptions, getWeekShifts, roomTypeRole } from "@/services/shiftService";
import { MOCK_ROOMS, ROOM_STATUSES } from "@/utils/data/mockRooms";
import { SHIFT_STATUSES, SHIFT_STATUS_OPTIONS } from "@/utils/data/mockShifts";
import { toDateOnly } from "@/utils/format";
import { ROUTES } from "@/utils/routes";

// Weeks offered in the week picker, around this week.
const WEEK_OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const WEEK_SUFFIXES = { [-1]: " (tuần trước)", 0: " (tuần này)", 1: " (tuần sau)" };
const WEEK_NAMES = { 0: "Tuần này", 1: "Tuần sau" };

const ROOM_OPTIONS = MOCK_ROOMS.filter((room) => room.status === ROOM_STATUSES.ACTIVE).map((room) => ({ value: String(room.id), label: room.name }));

const DIALOGS = {
    DETAIL: "detail",
    UNASSIGNED: "unassigned",
    ASSIGN: "assign",
    REPLACE: "replace",
    EDIT: "edit",
    MONTHLY: "monthly",
};

// "Tuần sau còn 4 vị trí chưa phân ca và 2 ca cần người thay (nghỉ phép). Bấm vào ô để phân ca."
const pendingWorkText = (week) => {
    const parts = [];
    if (week.summary.unassigned > 0) parts.push(`${week.summary.unassigned} vị trí chưa phân ca`);
    if (week.summary.needReplacement > 0) parts.push(`${week.summary.needReplacement} ca cần người thay (nghỉ phép)`);
    if (parts.length === 0) return null;
    return `${WEEK_NAMES[week.weekOffset] ?? `Tuần ${week.label}`} còn ${parts.join(" và ")}. Bấm vào ô để phân ca.`;
};

const WorkShiftManagement = () => {
    const navigate = useNavigate();
    const [weekOffset, setWeekOffset] = useState(0);
    const [roomId, setRoomId] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [copying, setCopying] = useState(false);
    const [weekOptions] = useState(() => getWeekOptions(WEEK_OFFSETS));

    const { loading, value: result } = useAsync(() => getWeekShifts({ weekOffset }), [weekOffset, reloadKey]);
    const week = result?.success ? result.data : null;

    const isVisible = (cell) =>
        (!roomId || String(cell.room.id) === roomId) &&
        (!role || roomTypeRole(cell.room.type) === role) &&
        (!status || cell.status === status);

    // An editable week opens the planning popups; otherwise the card only shows what happened.
    const openCell = (cell) => {
        if (week.editable) {
            if (!cell.staff) setDialog({ type: DIALOGS.ASSIGN, cell });
            else if (cell.status === SHIFT_STATUSES.LEAVE) setDialog({ type: DIALOGS.REPLACE, cell });
            else setDialog({ type: DIALOGS.EDIT, cell });
            return;
        }
        setDialog({ type: cell.staff ? DIALOGS.DETAIL : DIALOGS.UNASSIGNED, cell });
    };

    const handleSaved = (message) => {
        setDialog(null);
        toast.success(message);
        setReloadKey((current) => current + 1);
    };

    const handleCopy = async () => {
        setCopying(true);
        const response = await copyPreviousWeek({ weekOffset });
        setCopying(false);
        toast[response.data?.copied > 0 ? "success" : "info"](response.message);
        setReloadKey((current) => current + 1);
    };

    // TODO: open the request itself once the "Đơn xin nghỉ" page exists.
    const viewLeave = () => navigate(ROUTES.ADMIN_LEAVE_REQUESTS);

    const today = toDateOnly(new Date());
    const pendingWork = week?.editable ? pendingWorkText(week) : null;

    return (
        <div className="flex flex-col gap-5">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Phân ca</h1>
                    <p className="page-description">
                        {week?.editable ? "Tuần chưa diễn ra · bấm vào ô để phân ca hoặc đổi người" : "Theo dõi trạng thái ca làm việc của nhân viên"}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {week?.editable && (
                        <button type="button" className="btn btn-secondary" disabled={copying} onClick={handleCopy}>
                            {copying ? "Đang sao chép…" : "Sao chép tuần trước"}
                        </button>
                    )}
                    <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: DIALOGS.MONTHLY })}>
                        Phân ca theo tháng
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <FilterSelect id="shift-room-filter" label="Phòng" options={ROOM_OPTIONS} value={roomId} onChange={setRoomId} />
                <FilterSelect id="shift-role-filter" label="Vai trò" options={SHIFT_ROLE_OPTIONS} value={role} onChange={setRole} />
                <FilterSelect id="shift-status-filter" label="Trạng thái" options={SHIFT_STATUS_OPTIONS} value={status} onChange={setStatus} />
                <select
                    id="shift-week"
                    className="input num w-auto min-w-64"
                    aria-label="Tuần"
                    value={weekOffset}
                    onChange={(event) => setWeekOffset(Number(event.target.value))}
                >
                    {weekOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {`Tuần: ${option.label}${WEEK_SUFFIXES[option.value] ?? ""}`}
                        </option>
                    ))}
                </select>
            </div>

            {pendingWork && <p className="alert alert-danger border-0">{pendingWork}</p>}

            {loading || !week ? <div className="skeleton h-[640px] w-full" aria-hidden="true" /> : <ShiftWeekGrid week={week} isVisible={isVisible} onSelect={openCell} />}

            {dialog?.type === DIALOGS.DETAIL && <ShiftDetailPopup cell={dialog.cell} onClose={() => setDialog(null)} onViewLeave={viewLeave} />}
            {dialog?.type === DIALOGS.UNASSIGNED && (
                <UnassignedShiftPopup
                    cell={dialog.cell}
                    onClose={() => setDialog(null)}
                    onAssign={dialog.cell.date >= today ? (cell) => setDialog({ type: DIALOGS.ASSIGN, cell }) : undefined}
                />
            )}
            {(dialog?.type === DIALOGS.ASSIGN || dialog?.type === DIALOGS.REPLACE) && (
                <ShiftAssignPopup
                    cell={dialog.cell}
                    replace={dialog.type === DIALOGS.REPLACE}
                    onClose={() => setDialog(null)}
                    onSaved={handleSaved}
                />
            )}
            {dialog?.type === DIALOGS.EDIT && <ShiftEditPopup cell={dialog.cell} onClose={() => setDialog(null)} onSaved={handleSaved} />}
            {dialog?.type === DIALOGS.MONTHLY && <MonthlyShiftPopup onClose={() => setDialog(null)} onSaved={handleSaved} />}
        </div>
    );
};

export default WorkShiftManagement;
