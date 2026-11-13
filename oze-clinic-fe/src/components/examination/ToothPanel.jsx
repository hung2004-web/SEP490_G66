import { useState } from "react";
import { isPrimaryTooth, surfacesText, toothLabel } from "@/utils/examination";
import RowActions from "./RowActions";
import { ConditionField, NoteField, SurfacePicker } from "./ToothEntryFields";

const EMPTY_FORM = { condition: "", surfaces: [], note: "", replaced: false };

// Panel of the selected tooth: findings already recorded (edit / delete) and a form to add another one.
// entries: findings of this tooth. onAdd receives { tooth, condition, surfaces, note, replaced? }.
const ToothPanel = ({ tooth, entries = [], onAdd, onEdit, onRemove, onClose }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState("");
    const primary = isPrimaryTooth(tooth);
    const update = (changes) => setForm((current) => ({ ...current, ...changes }));

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!form.condition.trim()) {
            setError("Nhập tình trạng của răng.");
            return;
        }
        onAdd({ tooth, condition: form.condition.trim(), surfaces: form.surfaces, note: form.note.trim(), ...(primary && { replaced: form.replaced }) });
        setForm(EMPTY_FORM);
        setError("");
    };

    return (
        <form noValidate onSubmit={handleSubmit} aria-label={`Ghi nhận răng ${tooth}`} className="flex flex-col gap-3 rounded-xl border border-primary bg-canvas p-4">
            <p>
                <b className="font-semibold text-ink">Răng {tooth}</b> <span className="text-muted">· {toothLabel(tooth)}</span>
            </p>

            {entries.length > 0 && (
                <div className="flex flex-col gap-2 rounded-[10px] border border-border px-3 py-2.5">
                    <p className="text-caption font-semibold text-ink">Tình trạng đã ghi nhận ({entries.length})</p>
                    <ul className="flex flex-col gap-2">
                        {entries.map((entry) => (
                            <li key={entry.id} className="flex flex-wrap items-center gap-2">
                                <span className="shrink-0 rounded-full bg-surface-tint px-2 py-0.5 text-caption font-medium text-body">{entry.condition}</span>
                                <span className="min-w-0 flex-1 text-caption text-muted">
                                    Mặt {surfacesText(entry.surfaces)}
                                    {entry.note && ` · ${entry.note}`}
                                    {entry.replaced && " · Đã thay răng vĩnh viễn"}
                                </span>
                                <RowActions label={`${entry.condition} răng ${tooth}`} onEdit={() => onEdit(entry)} onRemove={() => onRemove(entry)} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {entries.length > 0 && <p className="text-caption font-semibold tracking-wide text-muted uppercase">Thêm tình trạng khác</p>}
            <div className="flex flex-col gap-3 sm:flex-row">
                <ConditionField
                    value={form.condition}
                    error={error}
                    onChange={(condition) => {
                        update({ condition });
                        if (error) setError("");
                    }}
                />
                <SurfacePicker label={primary ? "Mặt răng (chọn nhiều)" : "Mặt răng"} value={form.surfaces} onChange={(surfaces) => update({ surfaces })} />
            </div>
            {primary && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-tint px-3 py-2.5 text-body-sm text-ink">
                    <input type="checkbox" className="size-4" checked={form.replaced} onChange={(event) => update({ replaced: event.target.checked })} />
                    Răng này đã được thay bằng răng vĩnh viễn
                </label>
            )}
            <NoteField label="Mô tả tình trạng" value={form.note} onChange={(note) => update({ note })} />
            <div className="flex flex-wrap justify-end gap-2.5">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Bỏ chọn răng
                </button>
                <button type="submit" className="btn btn-primary">
                    Thêm tình trạng
                </button>
            </div>
        </form>
    );
};

export default ToothPanel;
