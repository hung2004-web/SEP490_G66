// Filter row of a list page, laid out the same everywhere: search box, then the dropdowns (the status one last),
// then "Xoá bộ lọc" while a filter is on. On a phone each box takes the full width.
const FilterBar = ({ children, canClear = false, onClear }) => (
    <div className="flex flex-wrap items-center gap-3">
        {children}
        {canClear && (
            <button type="button" className="btn btn-link" onClick={onClear}>
                Xoá bộ lọc
            </button>
        )}
    </div>
);

// Shared widths, so the boxes line up from page to page.
export const FILTER_SEARCH_CLASS = "w-full sm:w-80";
export const FILTER_SELECT_CLASS = "w-full sm:w-auto sm:min-w-48";

export default FilterBar;
