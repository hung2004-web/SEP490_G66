import { useLayoutEffect, useRef } from "react";
import { ArrowUpDown, Info, ListFilter, Search, X } from "lucide-react";
import { FilterPopover, SortPopover } from "@/components/medicalRecord/ExaminationFilterPopover";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { PAYMENT_HISTORY_STATUS, PAYMENT_HISTORY_TEXT } from "@/utils/messages";
import {
    HISTORY_FILTER_BUTTON_ID,
    HISTORY_SEARCH_ID,
    HISTORY_SORTS,
    HISTORY_SORT_BUTTON_ID,
    HISTORY_STATUSES,
    HISTORY_STATUS_BUTTON_ID,
    monthLabel,
} from "@/utils/paymentHistory";

const TOOL_BUTTON_CLASS = "btn btn-secondary h-8 px-3 max-md:w-full";
const POPOVER_PLACEMENT = "max-md:left-5 max-md:right-5 max-md:top-full max-md:mt-1.5 max-md:w-auto";
const CHIP_CLASS = "inline-flex items-center gap-1 rounded-full border border-border bg-surface-tint py-1 pl-2.5 pr-2 text-caption text-body hover:border-danger hover:text-danger";

const PaymentHistoryToolbar = ({
    query,
    searchInput,
    popover,
    months,
    statusCounts,
    monthCounts,
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
        const chips = chipsRef.current?.querySelectorAll("[data-history-chip]") ?? [];
        chips[Math.min(index, chips.length - 1)]?.focus({ preventScroll: true });
    });

    const chips = [
        ...query.status.map((value) => ({ group: "status", value, label: PAYMENT_HISTORY_TEXT.CHIP_STATUS(PAYMENT_HISTORY_STATUS[value].label) })),
        ...query.month.map((value) => ({ group: "month", value, label: monthLabel(value) })),
    ];
    const filterCount = chips.length;
    const sortLabel = HISTORY_SORTS.find((option) => option.value === query.sort)?.label;
    const groups = [
        {
            key: "status",
            title: PAYMENT_HISTORY_TEXT.STATUS_GROUP,
            options: HISTORY_STATUSES.map((value) => ({ value, label: <StatusBadge status={value} labels={PAYMENT_HISTORY_STATUS} />, count: statusCounts[value] ?? 0 })),
        },
        {
            key: "month",
            title: PAYMENT_HISTORY_TEXT.MONTH_GROUP,
            options: months.map((value) => ({ value, label: monthLabel(value), count: monthCounts[value] ?? 0 })),
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
                        id={HISTORY_SEARCH_ID}
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        className="input pr-10"
                        placeholder={PAYMENT_HISTORY_TEXT.SEARCH}
                        aria-label={PAYMENT_HISTORY_TEXT.SEARCH}
                        value={searchInput}
                        onChange={onSearchChange}
                        onCompositionStart={onCompositionStart}
                        onCompositionEnd={onCompositionEnd}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            className="btn btn-icon absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted hover:bg-surface-tint"
                            aria-label={PAYMENT_HISTORY_TEXT.CLEAR_SEARCH}
                            onClick={onClearSearch}
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="max-md:flex-1 md:relative">
                    <button
                        id={HISTORY_FILTER_BUTTON_ID}
                        type="button"
                        data-record-popover-opener=""
                        className={cx(TOOL_BUTTON_CLASS, filterCount > 0 && "border-primary bg-primary-soft text-primary")}
                        aria-expanded={popover === "filter"}
                        onClick={() => onTogglePopover("filter")}
                    >
                        <ListFilter className="size-4" aria-hidden="true" />
                        {PAYMENT_HISTORY_TEXT.FILTER}
                        {filterCount > 0 && (
                            <>
                                <span className="num rounded-full bg-primary px-1.5 text-caption text-on-primary">{filterCount}</span>
                                <span className="sr-only">{PAYMENT_HISTORY_TEXT.FILTER_UNIT}</span>
                            </>
                        )}
                    </button>
                    {popover === "filter" && (
                        <FilterPopover
                            groups={groups}
                            filters={{ status: query.status, month: query.month }}
                            openerId={HISTORY_FILTER_BUTTON_ID}
                            label={PAYMENT_HISTORY_TEXT.FILTER_LABEL}
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
                        id={HISTORY_SORT_BUTTON_ID}
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
                            options={HISTORY_SORTS}
                            openerId={HISTORY_SORT_BUTTON_ID}
                            className={cx("w-60", POPOVER_PLACEMENT)}
                            titleClassName="text-muted"
                            onSelect={onSelectSort}
                            onDismiss={onDismissPopover}
                        />
                    )}
                </div>
                <button id={HISTORY_STATUS_BUTTON_ID} type="button" className="btn btn-link h-8 max-md:flex-1" onClick={onOpenDrawer}>
                    <Info className="size-4" aria-hidden="true" />
                    {PAYMENT_HISTORY_TEXT.STATUS_HELP}
                </button>
            </div>
            {showChips && (
                <div ref={chipsRef} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <span className="num text-caption text-body" aria-hidden="true">
                        {PAYMENT_HISTORY_TEXT.SHOWN(shown, total)}
                    </span>
                    {chips.map((chip, index) => (
                        <button key={`${chip.group}-${chip.value}`} type="button" data-history-chip="" className={CHIP_CLASS} onClick={() => removeChip(chip, index)}>
                            {chip.label}
                            <X className="size-3" aria-hidden="true" />
                        </button>
                    ))}
                    <button type="button" className="btn h-8 px-3 hover:bg-surface-tint" onClick={onClearAll}>
                        {PAYMENT_HISTORY_TEXT.CLEAR_ALL}
                    </button>
                </div>
            )}
        </>
    );
};

export default PaymentHistoryToolbar;
