import SearchInput from "@/components/ui/SearchInput";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { cx } from "@/utils/cx";
import ReviewRequestItem from "./ReviewRequestItem";

// Left column of "Duyệt kết quả chụp": search, filter tabs and the results. The parent filters `requests`;
// filter is "pending" | "processing" | "all", counts: { pending, processing }.
const ReviewRequestList = ({ requests = [], selectedId, onSelect, search, onSearchChange, filter, onFilterChange, counts = {}, className }) => {
    const filterOptions = [
        { value: "pending", label: `Chờ duyệt (${counts.pending ?? 0})` },
        { value: "processing", label: `Đang xử lý (${counts.processing ?? 0})` },
        { value: "all", label: "Tất cả" },
    ];

    return (
        <div className={cx("flex w-full flex-col gap-3 lg:w-[360px] lg:shrink-0", className)}>
            <SearchInput
                id="imaging-review-search"
                label="Tìm kết quả chụp"
                placeholder="Tìm bệnh nhân, mã yêu cầu"
                value={search}
                onChange={onSearchChange}
            />
            <SegmentedControl label="Lọc theo trạng thái" options={filterOptions} value={filter} onChange={onFilterChange} className="self-start" />
            {requests.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-border px-3 py-6 text-center text-muted">Không có yêu cầu nào.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {requests.map((request) => (
                        <ReviewRequestItem key={request.id} request={request} selected={request.id === selectedId} onSelect={onSelect} />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ReviewRequestList;
