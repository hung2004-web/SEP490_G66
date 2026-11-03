import { Check, Minus, X } from "lucide-react";
import { cx } from "@/utils/cx";
import { SHIFT_STATUSES } from "@/utils/data/mockShifts";

// How each shift status reads; pending shows "Chưa điểm danh" only in the detail popup.
const STATUS_LOOKS = {
    [SHIFT_STATUSES.PRESENT]: { icon: Check, label: "Có mặt", text: "text-success", pill: "bg-success-soft" },
    [SHIFT_STATUSES.ABSENT]: { icon: X, label: "Vắng", text: "text-danger", pill: "bg-danger-soft" },
    [SHIFT_STATUSES.LEAVE]: { icon: Minus, label: "Nghỉ", text: "text-warning", pill: "bg-warning-soft" },
    [SHIFT_STATUSES.PENDING]: { icon: null, label: "Chưa điểm danh", text: "text-neutral", pill: "bg-neutral-soft" },
};

// Status line under the name on a schedule card: "✓ Có mặt". Nothing for a shift that has not started.
export const ShiftStatusText = ({ status }) => {
    const look = STATUS_LOOKS[status];
    if (!look?.icon) return null;
    const Icon = look.icon;
    return (
        <span className={cx("flex items-center gap-1 text-caption font-medium", look.text)}>
            <Icon className="size-3" aria-hidden="true" />
            {look.label}
        </span>
    );
};

// Rounded status tag for the "Chi tiết ca" popup.
export const ShiftStatusPill = ({ status }) => {
    const look = STATUS_LOOKS[status];
    if (!look) return null;
    const Icon = look.icon;
    return (
        <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold", look.text, look.pill)}>
            {Icon && <Icon className="size-3" aria-hidden="true" />}
            {look.label}
        </span>
    );
};
