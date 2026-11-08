import { useLayoutEffect, useRef } from "react";
import { ArrowUpDown, Info, ListFilter, Search, X } from "lucide-react";
import { FilterPopover, SortPopover } from "@/components/medicalRecord/ExaminationFilterPopover";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { PATIENT_DEBT_PAY_TYPE, PATIENT_DEBT_STATUS, PATIENT_DEBT_TEXT } from "@/utils/messages";
import { DEBT_FILTER_BUTTON_ID, DEBT_SEARCH_ID, DEBT_SORTS, DEBT_SORT_BUTTON_ID, DEBT_STATUSES, DEBT_STATUS_BUTTON_ID, DEBT_TYPES, DEBT_TYPE_ALL } from "@/utils/patientDebt";

const TOOL_BUTTON_CLASS = "btn btn-secondary h-8 px-3 max-md:w-full";
const POPOVER_PLACEMENT = "max-md:left-5 max-md:right-5 max-md:top-full max-md:mt-1.5 max-md:w-auto";
const TYPE_OPTIONS = [{ value: DEBT_TYPE_ALL, label: PATIENT_DEBT_TEXT.TYPE_ALL }, ...DEBT_TYPES.map((value) => ({ value, label: PATIENT_DEBT_PAY_TYPE[value].label }))];

const PatientDebtToolbar = ({
    query,
    searchInput,
    popover,
    typeCounts,
    statusCounts,
    shown,
    scopeTotal,
    onSelectType,
    onSearchChange,
    onCompositionStart,
    onCompositionEnd,
    onClearSearch,
    onTogglePopover,
    onToggleStatus,
    onClearStatus,
    onDoneFilter,
    onDismissPopover,
    onSelectSort,
    onRemoveStatus,
    onClearAll,
    onOpenDrawer,
}) => {
    const chipsRef = useRef(null);
    const pendingChip = useRef(null);

    useLayoutEffect(() => {
        const index = pendingChip.current;
        if (index == null) return;
        pendingChip.current = null;
        const chips = chipsRef.current?.querySelectorAll("[data-debt-chip]") ?? [];
        chips[Math.min(index, chips.length - 1)]?.focus({ preventScroll: true });
    });

    const filterCount = query.status.length;
    const sortLabel = DEBT_SORTS.find((option) => option.value === query.sort)?.label;
    const groups = [
        {
            key: "status",
            title: PATIENT_DEBT_TEXT.STATUS_GROUP,
            options: DEBT_STATUSES.map((value) => ({ value, label: <StatusBadge status={value} labels={PATIENT_DEBT_STATUS} />, count: statusCounts[value] })),
        },
    ];
    const showChips = Boolean(query.q) || filterCount > 0;

    const removeChip = (value, index) => {
        const last = filterCount === 1;
        if (!last) pendingChip.current = index < filterCount - 1 ? index : index - 1;
        onRemoveStatus(value, last);
    };

    return (
        <>
            <div className="flex flex-wrap gap-2 px-5 pt-4" role="group" aria-label={PATIENT_DEBT_TEXT.TYPE_GROUP}>
                {TYPE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className="group btn btn-secondary h-8 px-3 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
                        aria-pressed={query.type === option.value}
                        onClick={() => onSelectType(option.value)}
                    >
                        {option.label}
                        <span className="num text-caption font-medium text-muted group-hover:text-body group-aria-pressed:text-primary">{typeCounts[option.value]}</span>
                    </button>
                ))}
            </div>
            <div className="relative flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                <div className="search min-w-0 flex-1 basis-65">
                    <Search aria-hidden="true" />
                    <input
                        id={DEBT_SEARCH_ID}
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        className="input pr-10"
                        placeholder={PATIENT_DEBT_TEXT.SEARCH}
                        aria-label={PATIENT_DEBT_TEXT.SEARCH}
                        value={searchInput}
                        onChange={onSearchChange}
                        onCompositionStart={onCompositionStart}
                        onCompositionEnd={onCompositionEnd}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            className="btn btn-icon absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted hover:bg-surface-tint"
                            aria-label={PATIENT_DEBT_TEXT.CLEAR_SEARCH}
                            onClick={onClearSearch}
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="max-md:flex-1 md:relative">
                    <button
                        id={DEBT_FILTER_BUTTON_ID}
                        type="button"
                        data-record-popover-opener=""
                        className={cx(TOOL_BUTTON_CLASS, filterCount > 0 && "border-primary bg-primary-soft text-primary")}
                        aria-expanded={popover === "filter"}
                        onClick={() => onTogglePopover("filter")}
                    >
                        <ListFilter className="size-4" aria-hidden="true" />
                        {PATIENT_DEBT_TEXT.FILTER}
                        {filterCount > 0 && (
                            <>
                                <span className="num rounded-full bg-primary px-1.5 text-caption text-on-primary">{filterCount}</span>
                                <span className="sr-only">{PATIENT_DEBT_TEXT.FILTER_UNIT}</span>
                            </>
                        )}
                    </button>
                    {popover === "filter" && (
                        <FilterPopover
                            groups={groups}
                            filters={{ status: query.status }}
                            openerId={DEBT_FILTER_BUTTON_ID}
                            label={PATIENT_DEBT_TEXT.FILTER_LABEL}
                            dimEmpty={false}
                            className={cx("w-65", POPOVER_PLACEMENT)}
                            titleClassName="text-muted"
                            onToggle={(_, value) => onToggleStatus(value)}
                            onClear={onClearStatus}
                            onDone={onDoneFilter}
                            onDismiss={onDismissPopover}
                        />
                    )}
                </div>
                <div className="max-md:flex-1 md:relative">
                    <button
                        id={DEBT_SORT_BUTTON_ID}
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
                            options={DEBT_SORTS}
                            openerId={DEBT_SORT_BUTTON_ID}
                            className={cx("w-60", POPOVER_PLACEMENT)}
                            titleClassName="text-muted"
                            onSelect={onSelectSort}
                            onDismiss={onDismissPopover}
                        />
                    )}
                </div>
                <button id={DEBT_STATUS_BUTTON_ID} type="button" className="btn btn-link h-8 max-md:flex-1" onClick={onOpenDrawer}>
                    <Info className="size-4" aria-hidden="true" />
                    {PATIENT_DEBT_TEXT.STATUS_HELP}
                </button>
            </div>
            {showChips && (
                <div ref={chipsRef} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <span className="num text-caption text-muted" aria-hidden="true">
                        {PATIENT_DEBT_TEXT.SHOWN(shown, scopeTotal)}
                    </span>
                    {query.status.map((value, index) => (
                        <button
                            key={value}
                            type="button"
                            data-debt-chip=""
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-tint py-1 pl-2.5 pr-2 text-caption text-body hover:border-danger hover:text-danger"
                            onClick={() => removeChip(value, index)}
                        >
                            {PATIENT_DEBT_TEXT.CHIP(PATIENT_DEBT_STATUS[value].label)}
                            <X className="size-3" aria-hidden="true" />
                        </button>
                    ))}
                    <button type="button" className="btn h-8 px-3 hover:bg-surface-tint" onClick={onClearAll}>
                        {PATIENT_DEBT_TEXT.CLEAR_ALL}
                    </button>
                </div>
            )}
        </>
    );
};

export default PatientDebtToolbar;
