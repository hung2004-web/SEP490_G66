import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import { getShiftCandidates, saveShift } from "@/services/shiftService";
import { ShiftPlaceTable } from "./ShiftInfoTable";
import StaffPicker from "./StaffPicker";

const STAFF_ID = "shift-assign-staff";

// "2026-10-30" -> "30/10"
const dayMonth = (dateOnly) => `${dateOnly.slice(8, 10)}/${dateOnly.slice(5, 7)}`;

// Two popups in one:
// - replace = false: "Phân ca" for an empty shift;
// - replace = true: "Chọn người thay" for a shift whose person is on approved leave.
// onSaved(message) runs after a successful save.
const ShiftAssignPopup = ({ cell, replace = false, onClose, onSaved }) => {
    const { loading, value: result } = useAsync(
        () => getShiftCandidates({ date: cell.date, slot: cell.slot, roomId: cell.room.id }),
        [cell.key],
    );
    const [staffId, setStaffId] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const candidates = result?.success ? result.data : [];
    const staffLabel = replace ? "Người thay" : "Người phụ trách";

    const pickStaff = (id) => {
        setStaffId(id);
        setErrors((current) => ({ ...current, staffId: undefined }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!staffId) {
            setErrors({ staffId: `Vui lòng chọn ${staffLabel.toLowerCase()}.` });
            document.getElementById(STAFF_ID)?.focus();
            return;
        }

        setSaving(true);
        const response = await saveShift({ date: cell.date, slot: cell.slot, roomId: cell.room.id, staffId });
        setSaving(false);
        if (!response.success) {
            if (response.errors?.staffId) setErrors({ staffId: response.errors.staffId });
            else toast.error(response.errors?.form ?? response.message);
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal
            title={replace ? "Chọn người thay" : "Phân ca"}
            description={replace ? "Ca của người đã được duyệt nghỉ" : "Chọn người trực cho ca còn trống"}
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <ShiftPlaceTable cell={cell} />

                {replace && (
                    <p className="alert alert-warning border-0">
                        {cell.staff.name} đã được duyệt nghỉ ngày {dayMonth(cell.date)} ({cell.leave.wholeDay ? "cả ngày" : cell.slotLabel.toLowerCase()}).
                        Chọn người thay cho ca này.
                    </p>
                )}

                <FormField id={STAFF_ID} label={staffLabel} required error={errors.staffId}>
                    <StaffPicker
                        id={STAFF_ID}
                        candidates={candidates}
                        loading={loading}
                        value={staffId}
                        onChange={pickStaff}
                        invalid={Boolean(errors.staffId)}
                    />
                </FormField>

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Đang lưu…" : replace ? "Lưu người thay" : "Lưu"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ShiftAssignPopup;
