import { useRef } from "react";
import { cx } from "@/utils/cx";

const AppointmentTabs = ({ tabs, selected, onSelect, labelledBy, idPrefix }) => {
    const tabRefs = useRef({});
    const tabId = (key) => `${idPrefix}-tab-${key}`;
    const panelId = `${idPrefix}-panel`;

    const focusTab = (index) => {
        const tab = tabs[(index + tabs.length) % tabs.length];
        onSelect(tab.key);
        tabRefs.current[tab.key]?.focus();
    };

    const handleKeyDown = (event, index) => {
        const targets = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: tabs.length - 1,
        };
        if (!(event.key in targets)) return;
        event.preventDefault();
        focusTab(targets[event.key]);
    };

    return (
        <div className="-mx-1 overflow-x-auto p-1">
            <div role="tablist" aria-labelledby={labelledBy} className="flex min-w-max gap-6 border-b border-border">
                {tabs.map((tab, index) => {
                    const isSelected = tab.key === selected;
                    return (
                        <button
                            key={tab.key}
                            ref={(node) => {
                                tabRefs.current[tab.key] = node;
                            }}
                            id={tabId(tab.key)}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            aria-controls={panelId}
                            tabIndex={isSelected ? 0 : -1}
                            onClick={() => onSelect(tab.key)}
                            onKeyDown={(event) => handleKeyDown(event, index)}
                            className={cx(
                                "-mb-px flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-2 text-label md:min-h-0",
                                isSelected ? "border-primary font-semibold text-primary" : "border-transparent text-muted hover:text-ink",
                            )}
                        >
                            <span>{tab.label}</span>
                            {tab.count != null && (
                                <>
                                    {" "}
                                    <span
                                        className={cx(
                                            "num rounded-full px-2 text-caption",
                                            isSelected ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted",
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default AppointmentTabs;
