import { useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createRoom, updateRoom } from "@/services/roomService";
import { ROOM_TYPE_OPTIONS } from "@/utils/data/mockRooms";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const ROOM_LIMITS = { CODE_MAX: 10, NAME_MAX: 100 };

const EMPTY_FORM = { code: "", name: "", type: "" };

const validateRoom = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.code)) errors.code = requiredMessage("mã phòng");
    else if (form.code.trim().length > ROOM_LIMITS.CODE_MAX) errors.code = `Mã phòng không được vượt quá ${ROOM_LIMITS.CODE_MAX} ký tự.`;
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên phòng");
    else if (form.name.trim().length > ROOM_LIMITS.NAME_MAX) errors.name = `Tên phòng không được vượt quá ${ROOM_LIMITS.NAME_MAX} ký tự.`;
    if (!form.type) errors.type = "Vui lòng chọn loại phòng.";
    return errors;
};

// Add (room = null) or update a room. onSaved(message) runs after a successful save.
const RoomFormPopup = ({ room, onClose, onSaved }) => {
    const editing = Boolean(room);
    const [form, setForm] = useState(() =>
        editing ? { code: room.code, name: room.name, type: room.type } : EMPTY_FORM,
    );
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
        <Modal
            title={editing ? `Chỉnh sửa phòng ${room.code}` : "Thêm phòng"}
            description={editing ? undefined : "Phòng mới sẽ ở trạng thái Sẵn sàng."}
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {errors.form && (
                    <p role="alert" className="alert alert-danger">
                        {errors.form}
                    </p>
                )}
                <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                    <FormField id="room-code" label="Mã phòng" required error={errors.code}>
                        <input {...fieldProps("code")} className="input uppercase" placeholder="VD: P101" maxLength={ROOM_LIMITS.CODE_MAX} />
                    </FormField>
                    <FormField id="room-name" label="Tên phòng" required error={errors.name}>
                        <input {...fieldProps("name")} className="input" placeholder="VD: Phòng khám" maxLength={ROOM_LIMITS.NAME_MAX} />
                    </FormField>
                </div>
                <FormField id="room-type" label="Loại phòng" required error={errors.type}>
                    <select {...fieldProps("type")} className="input">
                        <option value="">Chọn loại phòng</option>
                        {ROOM_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        {editing ? "Lưu thay đổi" : "Thêm phòng"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RoomFormPopup;
