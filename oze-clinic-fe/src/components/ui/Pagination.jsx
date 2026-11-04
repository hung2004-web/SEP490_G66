import { Fragment } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/utils/cx";

const ICON_BUTTON_CLASS = "btn btn-secondary btn-icon size-8";
const MAX_FULL_PAGE_COUNT = 7;

// Every page up to MAX_FULL_PAGE_COUNT; beyond that the first, the last and three around the current: 1 2 3 … 219.
const visiblePages = (page, totalPages) => {
    if (totalPages <= MAX_FULL_PAGE_COUNT) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const start = Math.min(Math.max(page - 1, 1), totalPages - 2);
    return [...new Set([1, start, start + 1, start + 2, totalPages])];
};

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
        {visiblePages(page, totalPages).map((pageNumber, index, pages) => (
            <Fragment key={pageNumber}>
                {index > 0 && pageNumber - pages[index - 1] > 1 && (
                    <span className="num text-caption text-muted" aria-hidden="true">
                        …
                    </span>
                )}
                <button
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
            </Fragment>
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
