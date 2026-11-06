import { useEffect, useEffectEvent } from "react";
import { Check } from "lucide-react";
import { cx } from "@/utils/cx";
import { SORT_OPTIONS } from "@/utils/medicalRecord";

const isPopoverNode = (node) => node instanceof Element && (node.hasAttribute("data-record-popover") || node.hasAttribute("data-record-popover-opener"));

const PopoverPanel = ({ label, onDismiss, className, children }) => {
    const dismiss = useEffectEvent(onDismiss);

    useEffect(() => {
        const handleClick = (event) => {
            if (event.composedPath().some(isPopoverNode)) return;
            dismiss(false);
        };
        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            dismiss(true);
        };
        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div
            data-record-popover=""
            role="dialog"
            aria-label={label}
            className={cx("absolute left-0 top-10 z-20 max-h-115 overflow-auto rounded-lg border border-border bg-canvas p-2 shadow-lg", className)}
        >
            {children}
        </div>
    );
};

const GROUP_TITLE_CLASS = "mx-1 mb-1.5 mt-0.5 text-caption font-semibold uppercase tracking-wide text-placeholder";

export const FilterPopover = ({ groups, filters, onToggle, onClear, onDone, onDismiss }) => (
    <PopoverPanel label="Lọc phiếu khám" onDismiss={onDismiss} className="w-75">
        {groups.map((group) => (
            <div key={group.key} className="border-b border-border px-1 pb-2 pt-1.5">
                <p className={GROUP_TITLE_CLASS}>{group.title}</p>
                {group.options.map((option) => (
                    <label
                        key={option.value}
                        className={cx(
                            "flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-body-sm hover:bg-surface-tint",
                            option.count === 0 && "opacity-55",
                        )}
                    >
                        <input
                            type="checkbox"
                            className="accent-primary"
                            checked={filters[group.key].includes(option.value)}
                            onChange={() => onToggle(group.key, option.value)}
                        />
                        <span>{option.label}</span>
                        <span className="num ml-auto text-caption text-placeholder">{option.count}</span>
                    </label>
                ))}
            </div>
        ))}
        <div className="sticky -bottom-2 flex justify-between border-t border-border bg-canvas px-1 pb-0.5 pt-2">
            <button type="button" className="btn h-8 px-3 hover:bg-surface-tint" onClick={onClear}>
                Xóa bộ lọc
            </button>
            <button type="button" className="btn btn-primary h-8 px-3" onClick={onDone}>
                Xong
            </button>
        </div>
    </PopoverPanel>
);

export const SortPopover = ({ sort, onSelect, onDismiss }) => (
    <PopoverPanel label="Sắp xếp theo" onDismiss={onDismiss} className="w-60">
        <p className={cx(GROUP_TITLE_CLASS, "px-2 py-1")}>Sắp xếp theo</p>
        {SORT_OPTIONS.map((option) => {
            const active = option.value === sort;
            return (
                <button
                    key={option.value}
                    type="button"
                    className={cx(
                        "flex w-full items-center gap-2 rounded-md p-2 text-left text-body-sm hover:bg-surface-tint",
                        active ? "font-semibold text-primary" : "text-body",
                    )}
                    onClick={() => onSelect(option.value)}
                >
                    {active ? <Check className="size-3.5" aria-hidden="true" /> : <span className="w-3.5" aria-hidden="true" />}
                    {option.label}
                </button>
            );
        })}
    </PopoverPanel>
);
