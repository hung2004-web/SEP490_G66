import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import { AVAILABILITY, deleteShift, getShiftCandidates, saveShift } from "@/services/shiftService";
import { ShiftPlaceTable } from "./ShiftInfoTable";

const STAFF_ID = "shift-edit-staff";
const TASK_ID = "shift-edit-task";
const NOTE_ID = "shift-edit-note";
const TASK_MAX = 200;
const NOTE_MAX = 500;

const UNAVAILABLE_NOTES = {
    [AVAILABILITY.BUSY]: "đã có ca khác",
    [AVAILABILITY.LEAVE]: "nghỉ phép",
};

// "Sửa phân ca" popup of an assigned shift that has not started: change the person, task or note, or delete the shift.
// onSaved(message) runs after a save or a delete.
const ShiftEditPopup = ({ cell, onClose, onSaved }) => {
    const { loading, value: result } = useAsync(
        () => getShiftCandidates({ date: cell.date, slot: cell.slot, roomId: cell.room.id }),
        [cell.key],
    );
    const [staffId, setStaffId] = useState(cell.staff.id);
    const [task, setTask] = useState(cell.task);
    const [note, setNote] = useState(cell.note);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const candidates = result?.success ? result.data : [];

    const finish = (response) => {
        setBusy(false);
        if (!response.success) {
            if (response.errors?.staffId) setError(response.errors.staffId);
            else toast.error(response.errors?.form ?? response.message);
            return;
        }
        onSaved(response.message);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setBusy(true);
        finish(await saveShift({ date: cell.date, slot: cell.slot, roomId: cell.room.id, staffId, task, note }));
    };

    const handleDelete = async () => {
        setBusy(true);
        finish(await deleteShift({ date: cell.date, slot: cell.slot, roomId: cell.room.id }));
    };

    return (
        <Modal title="Sửa phân ca" description="Đổi người, nhiệm vụ hoặc ghi chú của ca đã phân" onClose={onClose} closeDisabled={busy}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <ShiftPlaceTable cell={cell} />

                <FormField id={STAFF_ID} label="Người phụ trách" required error={error}>
                    <select
                        id={STAFF_ID}
                        className="input"
                        disabled={loading}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `${STAFF_ID}-error` : undefined}
                        value={staffId}
                        onChange={(event) => {
                            setStaffId(Number(event.target.value));
                            setError(null);
                        }}
                    >
                        {loading && <option value={cell.staff.id}>{`${cell.staff.name} · ${cell.staff.roleLabel}`}</option>}
                        {candidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id} disabled={candidate.availability !== AVAILABILITY.FREE}>
                                {`${candidate.name} · ${candidate.roleLabel}`}
                                {UNAVAILABLE_NOTES[candidate.availability] && ` (${UNAVAILABLE_NOTES[candidate.availability]})`}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField id={TASK_ID} label="Nhiệm vụ trong ca">
                    <input id={TASK_ID} className="input" maxLength={TASK_MAX} value={task} onChange={(event) => setTask(event.target.value)} />
                </FormField>

                <FormField id={NOTE_ID} label="Ghi chú">
                    <textarea id={NOTE_ID} className="input" rows={3} maxLength={NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} />
                </FormField>

                <div className="modal-actions -mx-6 mt-2 items-center border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-link mr-auto px-0 font-semibold text-danger" disabled={busy} onClick={handleDelete}>
                        Xoá ca này
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy ? "Đang lưu…" : "Lưu"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ShiftEditPopup;
