import { useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createRoom, updateRoom } from "@/services/roomService";
import { cx } from "@/utils/cx";
import { ROOM_STATUSES, ROOM_STATUS_OPTIONS, ROOM_TYPE_OPTIONS } from "@/utils/data/mockRooms";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const ROOM_LIMITS = { NAME_MAX: 100, FLOOR_MAX: 20, DESCRIPTION_MAX: 500 };

const EMPTY_FORM = { name: "", type: "", floor: "", status: ROOM_STATUSES.ACTIVE, description: "" };

const validateRoom = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên phòng");
    else if (form.name.trim().length > ROOM_LIMITS.NAME_MAX) errors.name = `Tên phòng không được vượt quá ${ROOM_LIMITS.NAME_MAX} ký tự.`;
    if (!form.type) errors.type = "Vui lòng chọn loại phòng.";
    if (!form.status) errors.status = "Vui lòng chọn trạng thái.";
    return errors;
};

const toRoomForm = (room) => ({
    name: room.name,
    type: room.type,
    floor: room.floor ?? "",
    status: room.status,
    description: room.description ?? "",
});

// Add (room = null) or update a room. onSaved(message) runs after a successful save.
const RoomFormPopup = ({ room, onClose, onSaved }) => {
    const editing = Boolean(room);
    const [form, setForm] = useState(() => (editing ? toRoomForm(room) : EMPTY_FORM));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const fieldProps = (name) => ({
        id: `room-${name}`,
        name,
        value: form[name],
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `room-${name}-error` : undefined,
        onChange: (event) => {
            setForm((current) => ({ ...current, [name]: event.target.value }));
            setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
        },
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateRoom(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const result = editing ? await updateRoom(room.id, form) : await createRoom(form);
        setSaving(false);

        if (!result.success) {
            setErrors(result.errors ?? {});
            return;
        }
        onSaved(result.message);
    };

    return (
        <Modal title={editing ? "Chỉnh sửa phòng" : "Thêm phòng"} onClose={onClose} closeDisabled={saving}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {errors.form && (
                    <p role="alert" className="alert alert-danger">
                        {errors.form}
                    </p>
                )}
                <FormField id="room-name" label="Tên phòng" required error={errors.name}>
                    <input {...fieldProps("name")} className="input" placeholder="Ví dụ: Phòng chụp chiếu 3" maxLength={ROOM_LIMITS.NAME_MAX} />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="room-type" label="Loại phòng" required error={errors.type}>
                        <select {...fieldProps("type")} className={cx("input", !form.type && "text-placeholder")}>
                            <option value="">Chọn loại phòng</option>
                            {ROOM_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="text-ink">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField id="room-floor" label="Tầng">
                        <input {...fieldProps("floor")} className="input" placeholder="Ví dụ: Tầng 1" maxLength={ROOM_LIMITS.FLOOR_MAX} />
                    </FormField>
                </div>
                <FormField id="room-status" label="Trạng thái" required error={errors.status}>
                    <select {...fieldProps("status")} className="input">
                        {ROOM_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField id="room-description" label="Mô tả">
                    <textarea {...fieldProps("description")} className="input" rows={3} maxLength={ROOM_LIMITS.DESCRIPTION_MAX} />
                </FormField>
                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Lưu phòng
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RoomFormPopup;
