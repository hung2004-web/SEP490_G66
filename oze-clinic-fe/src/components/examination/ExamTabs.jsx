import { useRef } from "react";
import { cx } from "@/utils/cx";
import { EXAM_TABS } from "@/utils/messages";

// Tab bar of the exam screen. tabs: [{ key, label }]; disabledKeys: tabs locked until the exam starts.
// idPrefix links each tab to its panel: tab id `${idPrefix}-tab-${key}`, panel id `${idPrefix}-panel-${key}`.
const ExamTabs = ({ tabs = EXAM_TABS, value, onChange, disabledKeys = [], idPrefix = "exam", label = "Các mục khám" }) => {
    const listRef = useRef(null);
    const enabledTabs = tabs.filter((tab) => !disabledKeys.includes(tab.key));

    // Arrow keys / Home / End move between enabled tabs, as in the WAI-ARIA tabs pattern.
    const handleKeyDown = (event) => {
        const index = enabledTabs.findIndex((tab) => tab.key === value);
        const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: enabledTabs.length - 1 };
        if (!(event.key in moves) || enabledTabs.length === 0) return;
        event.preventDefault();
        const next = enabledTabs[(moves[event.key] + enabledTabs.length) % enabledTabs.length];
        onChange?.(next.key);
        listRef.current?.querySelector(`#${CSS.escape(`${idPrefix}-tab-${next.key}`)}`)?.focus();
    };

    return (
        <div ref={listRef} role="tablist" aria-label={label} className="-mb-px flex gap-1 overflow-x-auto" onKeyDown={handleKeyDown}>
            {tabs.map((tab) => {
                const selected = tab.key === value;
                const disabled = disabledKeys.includes(tab.key);
                return (
                    <button
                        key={tab.key}
                        id={`${idPrefix}-tab-${tab.key}`}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={`${idPrefix}-panel-${tab.key}`}
                        tabIndex={selected ? 0 : -1}
                        disabled={disabled}
                        className={cx(
                            "shrink-0 border-b-2 px-3 py-3 text-label whitespace-nowrap outline-none transition-colors focus-visible:shadow-focus",
                            selected ? "border-ink font-semibold text-ink" : "border-transparent text-muted",
                            disabled ? "cursor-not-allowed text-placeholder" : !selected && "cursor-pointer hover:text-ink",
                        )}
                        onClick={() => onChange?.(tab.key)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ExamTabs;
