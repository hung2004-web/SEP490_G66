import { useLayoutEffect, useRef } from "react";
import { ArrowUpDown, Info, ListFilter, Search, X } from "lucide-react";
import { FilterPopover, SortPopover } from "@/components/medicalRecord/ExaminationFilterPopover";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { REFUND_REQUEST_STATUS_LABELS } from "@/utils/data/mockRefundRequests";
import { REFUND_REQUEST_TEXT } from "@/utils/messages";
import {
    REFUND_FILTER_BUTTON_ID,
    REFUND_SEARCH_ID,
    REFUND_SORTS,
    REFUND_SORT_BUTTON_ID,
    REFUND_STATUSES,
    REFUND_STATUS_BUTTON_ID,
} from "@/utils/refundRequest";

const TOOL_BUTTON_CLASS = "btn btn-secondary h-8 px-3 max-md:w-full";
const POPOVER_PLACEMENT = "max-md:left-5 max-md:right-5 max-md:top-full max-md:mt-1.5 max-md:w-auto";
const CHIP_CLASS = "inline-flex items-center gap-1 rounded-full border border-border bg-surface-tint py-1 pl-2.5 pr-2 text-caption text-body hover:border-danger hover:text-danger";

const RefundRequestToolbar = ({
    query,
    searchInput,
    popover,
    statusCounts,
    shown,
    total,
    onSearchChange,
    onCompositionStart,
    onCompositionEnd,
    onClearSearch,
    onTogglePopover,
    onToggleFilter,
    onClearFilters,
    onDoneFilter,
    onDismissPopover,
    onSelectSort,
    onRemoveChip,
    onClearAll,
    onOpenDrawer,
}) => {
    const chipsRef = useRef(null);
    const pendingChip = useRef(null);

    useLayoutEffect(() => {
        const index = pendingChip.current;
        if (index == null) return;
        pendingChip.current = null;
        const chips = chipsRef.current?.querySelectorAll("[data-refund-chip]") ?? [];
        chips[Math.min(index, chips.length - 1)]?.focus({ preventScroll: true });
    });

    const chips = query.status.map((value) => ({ group: "status", value, label: REFUND_REQUEST_TEXT.CHIP_STATUS(REFUND_REQUEST_STATUS_LABELS[value].label) }));
    const filterCount = chips.length;
    const sortLabel = REFUND_SORTS.find((option) => option.value === query.sort)?.label;
    const groups = [
        {
            key: "status",
            title: REFUND_REQUEST_TEXT.STATUS_GROUP,
            options: REFUND_STATUSES.map((value) => ({ value, label: <StatusBadge status={value} labels={REFUND_REQUEST_STATUS_LABELS} />, count: statusCounts[value] ?? 0 })),
        },
    ];
    const showChips = Boolean(query.q) || filterCount > 0;

    const removeChip = (chip, index) => {
        const last = filterCount === 1;
        if (!last) pendingChip.current = index < filterCount - 1 ? index : index - 1;
        onRemoveChip(chip.group, chip.value, last);
    };

    return (
        <>
            <div className="relative flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                <div className="search min-w-0 flex-1 basis-65">
                    <Search aria-hidden="true" />
                    <input
                        id={REFUND_SEARCH_ID}
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        className="input pr-10"
                        placeholder={REFUND_REQUEST_TEXT.SEARCH}
                        aria-label={REFUND_REQUEST_TEXT.SEARCH}
                        value={searchInput}
                        onChange={onSearchChange}
                        onCompositionStart={onCompositionStart}
                        onCompositionEnd={onCompositionEnd}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            className="btn btn-icon absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted hover:bg-surface-tint"
                            aria-label={REFUND_REQUEST_TEXT.CLEAR_SEARCH}
                            onClick={onClearSearch}
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="max-md:flex-1 md:relative">
                    <button
                        id={REFUND_FILTER_BUTTON_ID}
                        type="button"
                        data-record-popover-opener=""
                        className={cx(TOOL_BUTTON_CLASS, filterCount > 0 && "border-primary bg-primary-soft text-primary")}
                        aria-expanded={popover === "filter"}
                        onClick={() => onTogglePopover("filter")}
                    >
                        <ListFilter className="size-4" aria-hidden="true" />
                        {REFUND_REQUEST_TEXT.FILTER}
                        {filterCount > 0 && (
                            <>
                                <span className="num rounded-full bg-primary px-1.5 text-caption text-on-primary">{filterCount}</span>
                                <span className="sr-only">{REFUND_REQUEST_TEXT.FILTER_UNIT}</span>
                            </>
                        )}
                    </button>
                    {popover === "filter" && (
                        <FilterPopover
                            groups={groups}
                            filters={{ status: query.status }}
                            openerId={REFUND_FILTER_BUTTON_ID}
                            label={REFUND_REQUEST_TEXT.FILTER_LABEL}
                            dimEmpty={false}
                            className={cx("w-65", POPOVER_PLACEMENT)}
                            titleClassName="text-muted"
                            onToggle={onToggleFilter}
                            onClear={onClearFilters}
                            onDone={onDoneFilter}
                            onDismiss={onDismissPopover}
                        />
                    )}
                </div>
                <div className="max-md:flex-1 md:relative">
                    <button
                        id={REFUND_SORT_BUTTON_ID}
                        type="button"
                        data-record-popover-opener=""
                        className={TOOL_BUTTON_CLASS}
                        aria-expanded={popover === "sort"}
                        onClick={() => onTogglePopover("sort")}
                    >
                        <ArrowUpDown className="size-4" aria-hidden="true" />
                        {sortLabel}
                    </button>
                    {popover === "sort" && (
                        <SortPopover
                            sort={query.sort}
                            options={REFUND_SORTS}
                            openerId={REFUND_SORT_BUTTON_ID}
                            className={cx("w-60", POPOVER_PLACEMENT)}
                            titleClassName="text-muted"
                            onSelect={onSelectSort}
                            onDismiss={onDismissPopover}
                        />
                    )}
                </div>
                <button id={REFUND_STATUS_BUTTON_ID} type="button" className="btn btn-link h-8 max-md:flex-1" onClick={onOpenDrawer}>
                    <Info className="size-4" aria-hidden="true" />
                    {REFUND_REQUEST_TEXT.STATUS_HELP}
                </button>
            </div>
            {showChips && (
                <div ref={chipsRef} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <span className="num text-caption text-body" aria-hidden="true">
                        {REFUND_REQUEST_TEXT.SHOWN(shown, total)}
                    </span>
                    {chips.map((chip, index) => (
                        <button key={`${chip.group}-${chip.value}`} type="button" data-refund-chip="" className={CHIP_CLASS} onClick={() => removeChip(chip, index)}>
                            {chip.label}
                            <X className="size-3" aria-hidden="true" />
                        </button>
                    ))}
                    <button type="button" className="btn h-8 px-3 hover:bg-surface-tint" onClick={onClearAll}>
                        {REFUND_REQUEST_TEXT.CLEAR_ALL}
                    </button>
                </div>
            )}
        </>
    );
};

export default RefundRequestToolbar;
