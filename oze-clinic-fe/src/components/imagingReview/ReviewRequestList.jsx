import { useId, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import StatusTabs from "@/components/ui/StatusTabs";
import { cx } from "@/utils/cx";
import { IMAGING_REVIEW_STATUS } from "@/utils/messages";
import ReviewRequestItem from "./ReviewRequestItem";

// One tab per status, after "Tất cả": Chờ duyệt, Cần chụp lại, Đã duyệt, Đã huỷ.
const STATUS_OPTIONS = Object.entries(IMAGING_REVIEW_STATUS).map(([value, meta]) => ({ value, label: meta.label, tone: meta.badge }));

// « / » button of the Figma queue pane (1010:2147 / 1010:2712).
const TOGGLE = "btn btn-secondary h-8 shrink-0 px-3 text-caption pointer-coarse:h-11";

// Left column of "Duyệt kết quả chụp": a card with search, status tabs and the results; « collapses it to a » button
// so the result takes the full width. The parent filters `requests`; filter: "" (all) or an IMAGING_REVIEW_STATUS key;
// counts: { "": total, [status]: n }.
const ReviewRequestList = ({ requests = [], selectedId, onSelect, search, onSearchChange, filter, onFilterChange, counts = {}, className }) => {
    const [collapsed, setCollapsed] = useState(false);
    const panelId = useId();

    if (collapsed) {
        return (
            <button
                type="button"
                className={cx(TOGGLE, "self-start")}
                aria-label="Mở rộng danh sách kết quả chụp"
                title="Mở rộng danh sách"
                aria-expanded={false}
                aria-controls={panelId}
                onClick={() => setCollapsed(false)}
            >
                »
            </button>
        );
    }

    return (
        <section id={panelId} aria-label="Danh sách kết quả chụp" className={cx("card-app flex w-full flex-col p-0 lg:w-90 lg:shrink-0", className)}>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-body-md font-semibold text-ink">Kết quả chụp</h2>
                    <p className="num text-caption text-muted">
                        {counts[""] ?? 0} kết quả · {counts.pending ?? 0} chờ duyệt
                    </p>
                </div>
                <button
                    type="button"
                    className={TOGGLE}
                    aria-label="Thu gọn danh sách kết quả chụp"
                    title="Thu gọn danh sách"
                    aria-expanded
                    aria-controls={panelId}
                    onClick={() => setCollapsed(true)}
                >
                    «
                </button>
            </div>
            <div className="flex flex-col gap-3 p-4">
                <SearchInput
                    id="imaging-review-search"
                    label="Tìm kết quả chụp"
                    placeholder="Tìm bệnh nhân, mã yêu cầu"
                    value={search}
                    onChange={onSearchChange}
                />
                <StatusTabs label="Lọc theo trạng thái" options={STATUS_OPTIONS} value={filter} onChange={onFilterChange} counts={counts} />
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
        </section>
    );
};

export default ReviewRequestList;
