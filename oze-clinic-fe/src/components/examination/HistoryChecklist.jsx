import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/utils/cx";
import { normalizeText } from "@/utils/format";

const TONES = {
    danger: { count: "bg-danger-soft text-danger", checked: "border-danger bg-danger-soft", accent: "accent-danger" },
    warning: { count: "bg-warning-soft text-warning", checked: "border-primary bg-primary-soft", accent: "accent-primary" },
    neutral: { count: "bg-surface-tint text-body", checked: "border-primary bg-primary-soft", accent: "accent-primary" },
};

// Options of the list plus items typed by the doctor, without duplicates.
const allOptions = (options, value) => [...options, ...value.filter((item) => !options.some((option) => normalizeText(option) === normalizeText(item)))];

// One collapsible group of the medical history (Dị ứng, Bệnh nền…): tick items, or type one that is not listed.
// Collapsed, the head shows the ticked items.
const HistoryChecklist = ({ title, options = [], value = [], onChange, tone = "neutral", placeholder, note, defaultOpen = true }) => {
    const panelId = useId();
    const inputId = useId();
    const [open, setOpen] = useState(defaultOpen);
    const [draft, setDraft] = useState("");
    const colors = TONES[tone] ?? TONES.neutral;
    const items = allOptions(options, value);
    const isChecked = (item) => value.includes(item);

    const toggle = (item) => onChange?.(isChecked(item) ? value.filter((entry) => entry !== item) : [...value, item]);

    const addDraft = () => {
        const text = draft.trim();
        if (!text) return;
        const existing = items.find((item) => normalizeText(item) === normalizeText(text));
        if (!existing) onChange?.([...value, text]);
        else if (!isChecked(existing)) onChange?.([...value, existing]);
        setDraft("");
    };

    return (
        <div className="rounded-[10px] border border-border px-3.5 pt-3 pb-3.5">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                className="flex w-full cursor-pointer items-center gap-2 rounded text-left outline-none focus-visible:shadow-focus"
                onClick={() => setOpen((current) => !current)}
            >
                <span className="font-semibold text-ink">{title}</span>
                <span className={cx("num shrink-0 rounded-full px-2 py-0.5 text-caption font-medium", value.length ? colors.count : TONES.neutral.count)}>
                    {value.length ? `${value.length} mục` : "Không có"}
                </span>
                <span className="ml-auto min-w-0 truncate text-caption text-muted">{!open && value.join(", ")}</span>
                <ChevronDown className={cx("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
            </button>

            {open && (
                <div id={panelId} className="mt-2.5 flex flex-col gap-2.5">
                    <fieldset>
                        <legend className="sr-only">{title}</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {items.map((item) => {
                                const checked = isChecked(item);
                                return (
                                    <label
                                        key={item}
                                        className={cx(
                                            "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-caption transition-colors",
                                            checked ? cx(colors.checked, "font-medium text-ink") : "border-border bg-canvas text-body",
                                            "cursor-pointer hover:border-primary",
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            className={cx("size-4 shrink-0", colors.accent)}
                                            checked={checked}
                                            onChange={() => toggle(item)}
                                        />
                                        <span className="min-w-0 break-words">{item}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                    {note && <p className="text-caption text-muted">{note}</p>}
                    <div className="flex gap-2">
                        <label htmlFor={inputId} className="sr-only">
                            Thêm mục khác vào {title}
                        </label>
                        <input
                            id={inputId}
                            className="input min-w-0 flex-1"
                            placeholder={placeholder}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                addDraft();
                            }}
                        />
                        <button type="button" className="btn btn-secondary shrink-0" disabled={!draft.trim()} onClick={addDraft}>
                            + Thêm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryChecklist;
