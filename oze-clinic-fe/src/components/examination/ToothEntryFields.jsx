import { useId } from "react";
import { cx } from "@/utils/cx";
import { EXAM_TOOTH_SURFACES, TOOTH_CONDITION_SUGGESTIONS } from "@/utils/messages";

// Free-text condition with suggestions ("Nhập tự do hoặc chọn gợi ý").
export const ConditionField = ({ value, onChange, error, hint, autoFocus = false }) => {
    const inputId = useId();
    const listId = useId();
    const errorId = useId();
    const hintId = useId();

    return (
        <div className="field min-w-0 flex-1">
            <label htmlFor={inputId} className="label">
                Tình trạng <span className="text-danger-solid">*</span>
            </label>
            <input
                id={inputId}
                className="input"
                list={listId}
                placeholder="Ví dụ: Nứt răng, lung lay độ 2"
                value={value}
                autoFocus={autoFocus}
                aria-invalid={error ? true : undefined}
                aria-describedby={cx(error && errorId, hint && hintId) || undefined}
                onChange={(event) => onChange(event.target.value)}
            />
            <datalist id={listId}>
                {TOOTH_CONDITION_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>
            {hint && (
                <p id={hintId} className="text-caption text-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className="error-text">
                    {error}
                </p>
            )}
        </div>
    );
};

// Surfaces of the tooth (several can be picked). variant "pills" (panel) or "segmented" (edit dialog).
export const SurfacePicker = ({ value = [], onChange, variant = "pills", label = "Mặt răng" }) => {
    // Keeps the surfaces in the M, O, D, B, L order whatever the click order.
    const toggle = (code) => {
        const next = value.includes(code) ? value.filter((item) => item !== code) : [...value, code];
        onChange(EXAM_TOOTH_SURFACES.map((surface) => surface.code).filter((item) => next.includes(item)));
    };
    const segmented = variant === "segmented";

    return (
        <fieldset className="min-w-0 flex-1">
            <legend className="label mb-1.5">{label}</legend>
            <div className={cx("flex flex-wrap", segmented ? "gap-1 rounded-lg bg-surface-tint p-1" : "gap-1.5")}>
                {EXAM_TOOTH_SURFACES.map(({ code, label: name }) => {
                    const selected = value.includes(code);
                    return (
                        <button
                            key={code}
                            type="button"
                            aria-pressed={selected}
                            className={cx(
                                "cursor-pointer text-caption font-medium outline-none transition-colors focus-visible:shadow-focus",
                                segmented
                                    ? cx("rounded-md px-3 py-1.5", selected ? "bg-canvas font-semibold text-ink shadow-sm" : "text-muted hover:text-ink")
                                    : cx("rounded-full border px-3 py-1", selected ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-canvas text-body hover:border-primary"),
                            )}
                            onClick={() => toggle(code)}
                        >
                            {code} · {name}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
};

export const NoteField = ({ label, value, onChange, placeholder }) => {
    const id = useId();
    return (
        <div className="field">
            <label htmlFor={id} className="label">
                {label}
            </label>
            <textarea id={id} className="input min-h-20" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
};
