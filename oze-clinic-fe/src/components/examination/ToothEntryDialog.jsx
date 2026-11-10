import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { toothLabel } from "@/utils/examination";
import { ConditionField, NoteField, SurfacePicker } from "./ToothEntryFields";

// "Sửa ghi nhận răng 36": edit one finding of the exam chart. onSave receives the updated entry.
const ToothEntryDialog = ({ entry, onSave, onClose }) => {
    const [form, setForm] = useState({ condition: entry.condition, surfaces: entry.surfaces ?? [], note: entry.note ?? "" });
    const [error, setError] = useState("");
    const update = (changes) => setForm((current) => ({ ...current, ...changes }));

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!form.condition.trim()) {
            setError("Nhập tình trạng của răng.");
            return;
        }
        onSave({ ...entry, condition: form.condition.trim(), surfaces: form.surfaces, note: form.note.trim() });
    };

    return (
        <Modal title={`Sửa ghi nhận răng ${entry.tooth}`} description={toothLabel(Number(entry.tooth))} onClose={onClose}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <ConditionField
                    value={form.condition}
                    error={error}
                    hint="Nhập tự do hoặc chọn gợi ý (ví dụ: Sâu răng mặt nhai, mẻ răng, lung lay độ 2)"
                    onChange={(condition) => {
                        update({ condition });
                        if (error) setError("");
                    }}
                />
                <SurfacePicker variant="segmented" value={form.surfaces} onChange={(surfaces) => update({ surfaces })} />
                <NoteField label="Mô tả phát hiện" value={form.note} onChange={(note) => update({ note })} />
                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ToothEntryDialog;
