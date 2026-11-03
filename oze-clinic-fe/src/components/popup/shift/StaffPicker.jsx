import { useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import { AVAILABILITY } from "@/services/shiftService";
import { cx } from "@/utils/cx";
import { normalizeText } from "@/utils/format";

const AVAILABILITY_LOOKS = {
    [AVAILABILITY.FREE]: { label: "Rảnh", className: "text-success" },
    [AVAILABILITY.BUSY]: { label: "Đã có ca khác", className: "text-muted" },
    [AVAILABILITY.LEAVE]: { label: "Nghỉ phép", className: "text-warning" },
};

const SKELETON_COUNT = 3;

// Search box + radio list of staff for a shift. Only free people can be picked; busy ones show the room they are in.
// id goes on the search box (give the field label htmlFor={id}); value / onChange: the picked staff id.
const StaffPicker = ({ id, candidates, loading, value, onChange, invalid }) => {
    const [keyword, setKeyword] = useState("");
    const shown = candidates.filter((candidate) => normalizeText(candidate.name).includes(normalizeText(keyword)));

    return (
        <div className="flex flex-col gap-2">
            <SearchInput id={id} label="Tìm nhân viên" placeholder="Tìm nhân viên…" value={keyword} onChange={setKeyword} />
            <div
                role="radiogroup"
                aria-label="Danh sách nhân viên"
                aria-invalid={invalid || undefined}
                aria-busy={loading || undefined}
                className={cx("max-h-60 overflow-y-auto rounded-lg border", invalid ? "border-danger-solid" : "border-border")}
            >
                {loading &&
                    Array.from({ length: SKELETON_COUNT }, (_, index) => (
                        <div key={index} className="px-4 py-3" aria-hidden="true">
                            <div className="skeleton h-4 w-40" />
                        </div>
                    ))}
                {!loading && shown.length === 0 && <p className="px-4 py-3 text-muted">Không tìm thấy nhân viên phù hợp.</p>}
                {!loading &&
                    shown.map((candidate) => {
                        const look = AVAILABILITY_LOOKS[candidate.availability];
                        const disabled = candidate.availability !== AVAILABILITY.FREE;
                        const selected = candidate.id === value;
                        return (
                            <label
                                key={candidate.id}
                                className={cx(
                                    "flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0",
                                    selected && "bg-primary-soft",
                                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-surface-tint",
                                )}
                            >
                                <input
                                    type="radio"
                                    name={`${id}-staff`}
                                    className="size-4 accent-primary"
                                    checked={selected}
                                    disabled={disabled}
                                    onChange={() => onChange(candidate.id)}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-semibold text-ink">{candidate.name}</span>
                                    <span className="block text-caption text-muted">
                                        {candidate.roleLabel}
                                        {candidate.busyRoom && ` · ${candidate.busyRoom}`}
                                    </span>
                                </span>
                                <span className={cx("text-caption font-medium", look.className)}>{look.label}</span>
                            </label>
                        );
                    })}
            </div>
            <p className="text-caption text-muted">Chỉ hiện nhân viên có vai trò phù hợp với loại phòng.</p>
        </div>
    );
};

export default StaffPicker;
