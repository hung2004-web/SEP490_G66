import { useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createRoom, updateRoom } from "@/services/roomService";
<<<<<<< HEAD
import { ROOM_TYPE_OPTIONS } from "@/utils/data/mockRooms";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const ROOM_LIMITS = { CODE_MAX: 10, NAME_MAX: 100, EQUIPMENT_MAX: 200 };

const EMPTY_FORM = { code: "", name: "", type: "", equipment: "" };

const validateRoom = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.code)) errors.code = requiredMessage("mã phòng");
    else if (form.code.trim().length > ROOM_LIMITS.CODE_MAX) errors.code = `Mã phòng không được vượt quá ${ROOM_LIMITS.CODE_MAX} ký tự.`;
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên phòng");
    else if (form.name.trim().length > ROOM_LIMITS.NAME_MAX) errors.name = `Tên phòng không được vượt quá ${ROOM_LIMITS.NAME_MAX} ký tự.`;
    if (!form.type) errors.type = "Vui lòng chọn loại phòng.";
    if (form.equipment.trim().length > ROOM_LIMITS.EQUIPMENT_MAX)
        errors.equipment = `Thiết bị chính không được vượt quá ${ROOM_LIMITS.EQUIPMENT_MAX} ký tự.`;
    return errors;
};

// Add (room = null) or update a room. onSaved(message) runs after a successful save.
const RoomFormPopup = ({ room, onClose, onSaved }) => {
    const editing = Boolean(room);
    const [form, setForm] = useState(() =>
        editing ? { code: room.code, name: room.name, type: room.type, equipment: room.equipment } : EMPTY_FORM,
    );
=======
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
>>>>>>> fix/service-room-management-pages
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
<<<<<<< HEAD
        <Modal
            title={editing ? `Chỉnh sửa phòng ${room.code}` : "Thêm phòng"}
            description={editing ? undefined : "Phòng mới sẽ ở trạng thái Sẵn sàng."}
            onClose={onClose}
            closeDisabled={saving}
        >
=======
        <Modal title={editing ? "Chỉnh sửa phòng" : "Thêm phòng"} onClose={onClose} closeDisabled={saving}>
>>>>>>> fix/service-room-management-pages
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {errors.form && (
                    <p role="alert" className="alert alert-danger">
                        {errors.form}
                    </p>
                )}
<<<<<<< HEAD
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
=======
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
>>>>>>> fix/service-room-management-pages
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </FormField>
<<<<<<< HEAD
                <FormField id="room-equipment" label="Thiết bị chính" error={errors.equipment}>
                    <textarea
                        {...fieldProps("equipment")}
                        className="input"
                        rows={3}
                        placeholder="VD: Ghế nha khoa A-dec 300"
                        maxLength={ROOM_LIMITS.EQUIPMENT_MAX}
                    />
                </FormField>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        {editing ? "Lưu thay đổi" : "Thêm phòng"}
=======
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
>>>>>>> fix/service-room-management-pages
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RoomFormPopup;
