import { useId, useState } from "react";
import { X } from "lucide-react";
import { cx } from "@/utils/cx";
import { toothName } from "@/utils/medicalRecord";
import { EXAM_SURFACE_KINDS, MEDICAL_RECORD_TOOTH_KIND, MEDICAL_RECORD_TOOTH_STATUS, MEDICAL_RECORD_TOOTH_SURFACE } from "@/utils/messages";

const DEFAULT_KIND = "caries";
const DEFAULT_STATUS = "condition";

// Front teeth (incisors, canines) have an incisal edge (I) instead of an occlusal surface (O).
const surfacesOf = (tooth) => [tooth % 10 <= 3 ? "I" : "O", "B", "L", "M", "D"];

const Chip = ({ selected, onClick, children }) => (
    <button
        type="button"
        aria-pressed={selected}
        className={cx(
            "cursor-pointer rounded-full border px-3 py-1 text-caption outline-none transition-colors focus-visible:shadow-focus",
            selected ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border bg-canvas text-body hover:border-primary",
        )}
        onClick={onClick}
    >
        {children}
    </button>
);

const ChipGroup = ({ label, children }) => (
    <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-caption font-semibold text-muted">{label}</legend>
        <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
);

const ToothEditorForm = ({ tooth, entry, onSave, onRemove, onClose }) => {
    const noteId = useId();
    const [draft, setDraft] = useState(() => ({
        kind: entry?.kind ?? DEFAULT_KIND,
        surf: entry?.surf ?? "",
        st: entry?.st ?? DEFAULT_STATUS,
        note: entry?.note ?? "",
    }));
    const needsSurface = EXAM_SURFACE_KINDS.includes(draft.kind);
    const canSave = !needsSurface || draft.surf.length > 0;

    const update = (changes) => setDraft((current) => ({ ...current, ...changes }));
    const toggleSurface = (code) =>
        update({ surf: draft.surf.includes(code) ? draft.surf.replace(code, "") : `${draft.surf}${code}` });

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!canSave) return;
        onSave?.({ ...entry, tooth, kind: draft.kind, surf: needsSurface ? draft.surf : undefined, st: draft.st, note: draft.note.trim() });
    };

    return (
        <form onSubmit={handleSubmit} aria-label={`Ghi nhận răng ${tooth}`} className="flex flex-col gap-4 rounded-lg border border-primary/40 bg-primary-softer p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-semibold text-ink">
                        Răng {tooth} {entry ? "· Sửa ghi nhận" : "· Ghi nhận mới"}
                    </p>
                    <p className="text-caption text-muted">{toothName(tooth)}</p>
                </div>
                {onClose && (
                    <button type="button" className="btn btn-icon size-8 bg-transparent text-muted hover:text-ink" aria-label="Đóng" onClick={onClose}>
                        <X className="size-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            <ChipGroup label="Tình trạng">
                {Object.entries(MEDICAL_RECORD_TOOTH_KIND).map(([kind, label]) => (
                    <Chip key={kind} selected={draft.kind === kind} onClick={() => update({ kind })}>
                        {label}
                    </Chip>
                ))}
            </ChipGroup>

            {needsSurface && (
                <ChipGroup label="Mặt răng">
                    {surfacesOf(tooth).map((code) => (
                        <Chip key={code} selected={draft.surf.includes(code)} onClick={() => toggleSurface(code)}>
                            {code} · {MEDICAL_RECORD_TOOTH_SURFACE[code]}
                        </Chip>
                    ))}
                </ChipGroup>
            )}

            <ChipGroup label="Trạng thái">
                {Object.entries(MEDICAL_RECORD_TOOTH_STATUS).map(([status, meta]) => (
                    <Chip key={status} selected={draft.st === status} onClick={() => update({ st: status })}>
                        {meta.label}
                    </Chip>
                ))}
            </ChipGroup>

            <div className="field">
                <label htmlFor={noteId} className="label">
                    Ghi chú
                </label>
                <textarea
                    id={noteId}
                    className="input min-h-16"
                    placeholder="Ví dụ: sâu ngà, chưa lộ tủy"
                    value={draft.note}
                    onChange={(event) => update({ note: event.target.value })}
                />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
                {needsSurface && !canSave && <p className="mr-auto text-caption text-danger">Chọn ít nhất một mặt răng.</p>}
                {entry && onRemove && (
                    <button type="button" className="btn border-danger bg-canvas text-danger hover:bg-danger-soft" onClick={() => onRemove(entry)}>
                        Xoá ghi nhận
                    </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={!canSave}>
                    {entry ? "Cập nhật" : "Lưu răng"}
                </button>
            </div>
        </form>
    );
};

// Form for one finding on the selected tooth. entry: the finding being edited, or null to add a new one.
// onSave receives { ...entry, tooth, kind, surf, st, note }; the parent assigns an id to new findings.
// The form resets whenever the tooth or the edited entry changes.
const ToothEditor = ({ tooth, entry = null, onSave, onRemove, onClose }) => {
    if (!tooth) return null;
    return <ToothEditorForm key={`${tooth}-${entry?.id ?? "new"}`} tooth={tooth} entry={entry} onSave={onSave} onRemove={onRemove} onClose={onClose} />;
};

export default ToothEditor;
