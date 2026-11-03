import Pagination from "@/components/ui/Pagination";

// Under a paged table: "Hiển thị 1–10 trong 23 bản ghi" + page buttons.
// data: the paged result { page, pageSize, totalItems, totalPages }; itemCount: rows on this page.
const TablePagination = ({ data, itemCount, onChange, label }) => {
    if (!data || data.totalItems === 0) return null;
    const firstItem = (data.page - 1) * data.pageSize + 1;
    const lastItem = firstItem + itemCount - 1;

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="num text-caption text-muted">
                Hiển thị {firstItem}–{lastItem} trong {data.totalItems} bản ghi
            </p>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={onChange} label={label} />
        </div>
    );
};

export default TablePagination;
