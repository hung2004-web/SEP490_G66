import Pagination from "@/components/ui/Pagination";

// Under a paged table: "Hiển thị 1–10 trong 23 bản ghi" + page buttons.
// data: the paged result { page, pageSize, totalItems, totalPages }; itemCount: rows on this page.
// pageSizeOptions + onPageSizeChange: optional "10 / trang" dropdown.
const TablePagination = ({ data, itemCount, onChange, label, pageSizeOptions, onPageSizeChange }) => {
    if (!data || data.totalItems === 0) return null;
    const firstItem = (data.page - 1) * data.pageSize + 1;
    const lastItem = firstItem + itemCount - 1;

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="num text-caption text-muted">
                Hiển thị {firstItem}–{lastItem} trong {data.totalItems} bản ghi
            </p>
            <div className="flex flex-wrap items-center gap-3">
                {pageSizeOptions && (
                    <select
                        className="input w-auto"
                        aria-label="Số dòng mỗi trang"
                        value={data.pageSize}
                        onChange={(event) => onPageSizeChange(Number(event.target.value))}
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size} / trang
                            </option>
                        ))}
                    </select>
                )}
                <Pagination page={data.page} totalPages={data.totalPages} onChange={onChange} label={label} />
            </div>
        </div>
    );
};

export default TablePagination;
