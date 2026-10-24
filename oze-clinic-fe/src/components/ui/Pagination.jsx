import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/utils/cx";

const ICON_BUTTON_CLASS = "btn btn-secondary btn-icon size-8";

// Previous / page numbers / next. label names the list for screen readers, e.g. "Phân trang danh sách phòng".
const Pagination = ({ page, totalPages, onChange, label = "Phân trang" }) => (
    <nav aria-label={label} className="flex items-center gap-2">
        <button
            type="button"
            className={ICON_BUTTON_CLASS}
            aria-label="Trang trước"
            title="Trang trước"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
        >
            <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
                key={pageNumber}
                type="button"
                className={cx(
                    "btn btn-icon num size-8",
                    pageNumber === page ? "bg-primary-soft text-primary" : "hover:bg-surface-tint",
                )}
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`Trang ${pageNumber}`}
                onClick={() => onChange(pageNumber)}
            >
                {pageNumber}
            </button>
        ))}
        <button
            type="button"
            className={ICON_BUTTON_CLASS}
            aria-label="Trang sau"
            title="Trang sau"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
        >
            <ChevronRight className="size-4" aria-hidden="true" />
        </button>
    </nav>
);

export default Pagination;
