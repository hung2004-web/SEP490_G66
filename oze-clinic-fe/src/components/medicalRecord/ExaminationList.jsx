import { useLayoutEffect, useRef } from "react";
import { ArrowUpDown, ListFilter, Search, X } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { cx } from "@/utils/cx";
import { RECORD_FILTER_BUTTON_ID, RECORD_PAGE_SIZE, RECORD_SEARCH_ID, RECORD_SORT_BUTTON_ID, SORT_OPTIONS, countFilters, displayText } from "@/utils/medicalRecord";
import { FilterPopover, SortPopover } from "./ExaminationFilterPopover";

const TOOL_BUTTON_CLASS = "btn btn-secondary h-8 px-3";

const ExaminationList = ({
    total,
    list,
    page,
    selectedId,
    numbers,
    ui,
    groups,
    onSearchChange,
    onCompositionStart,
    onCompositionEnd,
    onClearSearch,
    onTogglePopover,
    onToggleFilter,
    onClearFilters,
    onDoneFilters,
    onDismissPopover,
    onSelectSort,
    onRemoveFilter,
    onClearAll,
    onSelectVisit,
    onPageChange,
}) => {
    const chipsRef = useRef(null);
    const pagerRef = useRef(null);
    const pendingFocus = useRef(null);

    useLayoutEffect(() => {
        const request = pendingFocus.current;
        if (!request) return;
        pendingFocus.current = null;
        if (request.type === "chip") {
            const chips = chipsRef.current?.querySelectorAll("[data-record-chip]") ?? [];
            chips[Math.min(request.index, chips.length - 1)]?.focus({ preventScroll: true });
            return;
        }
        const active = document.activeElement;
        if (!active || active === document.body || active.disabled) pagerRef.current?.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
    });

    const filterCount = countFilters(ui.filters);
    const sortLabel = SORT_OPTIONS.find((option) => option.value === ui.sort)?.label;
    const chips = groups.flatMap((group) =>
        ui.filters[group.key].map((value) => ({
            group: group.key,
            value,
            label: `${group.title}: ${group.options.find((option) => option.value === value)?.label ?? value}`,
        })),
    );
    const totalPages = Math.max(1, Math.ceil(list.length / RECORD_PAGE_SIZE));
    const from = (page - 1) * RECORD_PAGE_SIZE;
    const rows = list.slice(from, from + RECORD_PAGE_SIZE);

    const removeChip = (chip, index) => {
        if (chips.length > 1) pendingFocus.current = { type: "chip", index: index < chips.length - 1 ? index : index - 1 };
        onRemoveFilter(chip.group, chip.value, chips.length === 1);
    };

    const changePage = (next) => {
        pendingFocus.current = { type: "page" };
        onPageChange(next);
    };

    return (
        <section className="card-app p-0 lg:w-80 lg:shrink-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 className="card-title">Các phiếu khám</h2>
                <span className="num text-caption text-muted">{total}</span>
            </div>
            <div className="px-4 pt-4">
                <div className="search">
                    <Search aria-hidden="true" />
                    <input
                        id={RECORD_SEARCH_ID}
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        className="input pr-10"
                        placeholder="Tìm dịch vụ, chẩn đoán"
                        aria-label="Tìm dịch vụ, chẩn đoán"
                        value={ui.searchInput}
                        onChange={onSearchChange}
                        onCompositionStart={onCompositionStart}
                        onCompositionEnd={onCompositionEnd}
                    />
                    {ui.searchInput && (
                        <button
                            type="button"
                            className="btn btn-icon absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted hover:bg-surface-tint"
                            aria-label="Xóa tìm kiếm"
                            onClick={onClearSearch}
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    <div className="relative">
                        <button
                            id={RECORD_FILTER_BUTTON_ID}
                            type="button"
                            data-record-popover-opener=""
                            className={cx(TOOL_BUTTON_CLASS, filterCount > 0 && "border-primary bg-primary-soft text-primary")}
                            aria-expanded={ui.popover === "filter"}
                            onClick={() => onTogglePopover("filter")}
                        >
                            <ListFilter className="size-4" aria-hidden="true" />
                            Lọc
                            {filterCount > 0 && <span className="num rounded-full bg-primary px-1.5 text-caption text-on-primary">{filterCount}</span>}
                        </button>
                        {ui.popover === "filter" && (
                            <FilterPopover
                                groups={groups}
                                filters={ui.filters}
                                openerId={RECORD_FILTER_BUTTON_ID}
                                onToggle={onToggleFilter}
                                onClear={onClearFilters}
                                onDone={onDoneFilters}
                                onDismiss={onDismissPopover}
                            />
                        )}
                    </div>
                    <div className="relative">
                        <button
                            id={RECORD_SORT_BUTTON_ID}
                            type="button"
                            data-record-popover-opener=""
                            className={TOOL_BUTTON_CLASS}
                            aria-expanded={ui.popover === "sort"}
                            onClick={() => onTogglePopover("sort")}
                        >
                            <ArrowUpDown className="size-4" aria-hidden="true" />
                            {sortLabel}
                        </button>
                        {ui.popover === "sort" && <SortPopover sort={ui.sort} openerId={RECORD_SORT_BUTTON_ID} onSelect={onSelectSort} onDismiss={onDismissPopover} />}
                    </div>
                </div>
                {(chips.length > 0 || ui.searchInput) && (
                    <div ref={chipsRef} className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="num text-caption text-muted">
                            Hiển thị {list.length}/{total}
                        </span>
                        {chips.map((chip, index) => (
                            <button
                                key={`${chip.group}-${chip.value}`}
                                type="button"
                                data-record-chip=""
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-tint py-0.5 pl-2.5 pr-2 text-caption text-body hover:border-danger hover:text-danger"
                                onClick={() => removeChip(chip, index)}
                            >
                                {chip.label}
                                <X className="size-3" aria-hidden="true" />
                            </button>
                        ))}
                        <button type="button" className="btn h-8 px-3 hover:bg-surface-tint" onClick={onClearAll}>
                            Xóa tất cả
                        </button>
                    </div>
                )}
            </div>
            {list.length > 0 ? (
                <>
                    <ul className="flex flex-col gap-2 p-4">
                        {rows.map((visit) => {
                            const selected = visit.id === selectedId;
                            return (
                                <li key={visit.id}>
                                    <button
                                        type="button"
                                        aria-current={selected ? "true" : undefined}
                                        className={cx(
                                            "flex w-full items-center gap-3 rounded-lg border py-3 pr-3.5 text-left",
                                            selected ? "border-primary border-l-3 bg-primary-softer pl-3" : "border-border bg-canvas pl-3.5 hover:border-border-strong",
                                        )}
                                        onClick={() => onSelectVisit(visit.id)}
                                    >
                                        <span
                                            className={cx(
                                                "num grid size-7.5 shrink-0 place-items-center rounded-full text-label font-bold",
                                                selected ? "bg-primary text-on-primary" : "bg-surface-tint text-body",
                                            )}
                                        >
                                            {numbers.get(visit.id)}
                                        </span>
                                        <span className="flex min-w-0 flex-col">
                                            <span className="num text-body-sm font-semibold text-ink">{displayText(visit.date)}</span>
                                            <span className="text-caption text-muted">
                                                {displayText(visit.wd)} · {displayText(visit.service)}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
                        <span className="num text-caption text-muted">
                            Hiển thị {from + 1}–{Math.min(from + RECORD_PAGE_SIZE, list.length)} / {list.length}
                        </span>
                        {totalPages > 1 && (
                            <div ref={pagerRef} className="-m-1 max-w-full overflow-x-auto p-1">
                                <Pagination page={page} totalPages={totalPages} onChange={changePage} label="Phân trang danh sách phiếu khám" />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="empty-state py-8">
                    <Search className="mb-2 size-6 text-placeholder" aria-hidden="true" />
                    <p className="empty-state-title">Không có kết quả phù hợp</p>
                    <p className="empty-state-text">Thử bỏ bớt bộ lọc hoặc đổi từ khóa.</p>
                    <button type="button" className="btn btn-secondary mt-3 h-8 px-3" onClick={onClearAll}>
                        Xóa tìm kiếm và bộ lọc
                    </button>
                </div>
            )}
        </section>
    );
};

export default ExaminationList;
