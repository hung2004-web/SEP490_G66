import { Pencil, Trash2 } from "lucide-react";
import { cx } from "@/utils/cx";

const iconButton =
    "inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted outline-none transition-colors focus-visible:shadow-focus";

// Edit / delete icon buttons of a row. label names the row for screen readers ("Sửa: Augmentin").
// A missing onEdit / onRemove hides that button.
const RowActions = ({ label, onEdit, onRemove, className }) => (
    <span className={cx("inline-flex items-center gap-1", className)}>
        {onEdit && (
            <button type="button" className={cx(iconButton, "hover:bg-primary-soft hover:text-primary")} aria-label={`Sửa: ${label}`} title="Sửa" onClick={onEdit}>
                <Pencil className="size-4" aria-hidden="true" />
            </button>
        )}
        {onRemove && (
            <button type="button" className={cx(iconButton, "hover:bg-danger-soft hover:text-danger")} aria-label={`Xoá: ${label}`} title="Xoá" onClick={onRemove}>
                <Trash2 className="size-4" aria-hidden="true" />
            </button>
        )}
    </span>
);

export default RowActions;
