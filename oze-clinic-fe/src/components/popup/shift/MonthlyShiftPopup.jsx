import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import { WEEKDAYS_SHORT, createMonthlyShifts, getShiftStaff, roomsForRole } from "@/services/shiftService";
import { cx } from "@/utils/cx";
import { SHIFT_SLOTS, SHIFT_SLOT_OPTIONS } from "@/utils/data/mockShifts";
import { formatDayMonth, toDateOnly } from "@/utils/format";
import { requiredMessage } from "@/utils/validation";

const STAFF_ID = "monthly-shift-staff";
const MONTH_ID = "monthly-shift-month";
const FROM_ID = "monthly-shift-from";
const TO_ID = "monthly-shift-to";
// Months offered, starting with this one.
const MONTH_COUNT = 6;
// Skipped shifts listed by date in the summary before it says "…".
const MAX_LISTED = 3;

const WEEKDAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

const pad = (value) => String(value).padStart(2, "0");

const emptyPattern = () => WEEKDAYS_SHORT.map(() => ({ [SHIFT_SLOTS.MORNING]: "", [SHIFT_SLOTS.AFTERNOON]: "" }));

// First and last day of a "2026-11" month, starting no earlier than tomorrow.
const monthRange = (month) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const now = new Date();
    const tomorrow = toDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const first = `${month}-01`;
    return { from: first > tomorrow ? first : tomorrow, to: toDateOnly(new Date(year, monthNumber, 0)) };
};

const monthOptions = () => {
    const now = new Date();
    return Array.from({ length: MONTH_COUNT }, (_, index) => {
        const month = new Date(now.getFullYear(), now.getMonth() + index, 1);
        return { value: `${month.getFullYear()}-${pad(month.getMonth() + 1)}`, label: `${pad(month.getMonth() + 1)}/${month.getFullYear()}` };
    });
};

const listDates = (dates) => {
    const unique = [...new Set(dates)].map(formatDayMonth);
    return unique.length > MAX_LISTED ? `${unique.slice(0, MAX_LISTED).join(", ")}…` : unique.join(", ");
};

// "Bỏ qua 2 ca ngày 13/11 (nghỉ phép) và 1 ca ngày 05/11 sáng (Phòng khám đã có Trần Minh Khoa)."
const skippedText = ({ skippedLeave, conflicts }) => {
    const parts = [];
    if (skippedLeave.length > 0) parts.push(`${skippedLeave.length} ca ngày ${listDates(skippedLeave)} (nghỉ phép)`);
    if (conflicts.length > 0) {
        const listed = conflicts
            .slice(0, MAX_LISTED)
            .map((item) => `${formatDayMonth(item.date)} ${item.slot === SHIFT_SLOTS.MORNING ? "sáng" : "chiều"} (${item.reason})`);
        parts.push(`${conflicts.length} ca ngày ${listed.join(", ")}${conflicts.length > MAX_LISTED ? "…" : ""}`);
    }
    return parts.length > 0 ? `Bỏ qua ${parts.join(" và ")}.` : null;
};

// "Phân ca theo tháng" popup: one person, a weekly pattern (room per weekday and slot), repeated over a date range.
// onSaved(message) runs after the shifts are created.
const MonthlyShiftPopup = ({ onClose, onSaved }) => {
    const [months] = useState(monthOptions);
    const [staffId, setStaffId] = useState("");
    const [month, setMonth] = useState(months[1].value);
    const [range, setRange] = useState(() => monthRange(months[1].value));
    const [pattern, setPattern] = useState(emptyPattern);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const { value: staffResult } = useAsync(() => getShiftStaff(), []);
    const staffList = staffResult?.success ? staffResult.data : [];
    const staff = staffList.find((member) => member.id === Number(staffId));
    const rooms = staff ? roomsForRole(staff.role) : [];

    const request = { staffId: Number(staffId), from: range.from, to: range.to, pattern };
    const previewKey = JSON.stringify(request);
    const preview = useAsync(
        () => (staff ? createMonthlyShifts({ ...request, dryRun: true }).then((result) => ({ key: previewKey, result })) : Promise.resolve(null)),
        [previewKey],
    );
    const previewResult = preview.value?.key === previewKey && preview.value.result.success ? preview.value.result.data : null;
    const count = previewResult?.created ?? 0;

    const clearError = (field) => setErrors((current) => ({ ...current, [field]: undefined }));

    const changeStaff = (value) => {
        setStaffId(value);
        setPattern(emptyPattern());
        clearError("staffId");
    };

    const changeMonth = (value) => {
        setMonth(value);
        setRange(monthRange(value));
        clearError("to");
    };

    const changeRange = (field, value) => {
        setRange((current) => ({ ...current, [field]: value }));
        clearError("to");
    };

    const changePattern = (weekday, slot, roomId) =>
        setPattern((current) => current.map((day, index) => (index === weekday ? { ...day, [slot]: roomId } : day)));

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (!staffId) nextErrors.staffId = requiredMessage("nhân viên");
        if (!range.from || !range.to) nextErrors.to = requiredMessage("khoảng ngày");
        else if (range.from > range.to) nextErrors.to = "Đến ngày phải sau Từ ngày.";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const response = await createMonthlyShifts(request);
        setSaving(false);
        if (!response.success) {
            toast.error(Object.values(response.errors ?? {})[0] ?? response.message);
            return;
        }
        onSaved(response.message);
    };

    const monthLabel = months.find((option) => option.value === month)?.label;
    const today = toDateOnly(new Date());

    return (
        <Modal
            title="Phân ca theo tháng"
            description="Chọn lịch lặp lại hằng tuần, hệ thống tạo ca cho cả tháng"
            size="md"
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id={STAFF_ID} label="Nhân viên" required error={errors.staffId}>
                        <select
                            id={STAFF_ID}
                            className="input"
                            aria-invalid={Boolean(errors.staffId)}
                            aria-describedby={errors.staffId ? `${STAFF_ID}-error` : undefined}
                            value={staffId}
                            onChange={(event) => changeStaff(event.target.value)}
                        >
                            <option value="">Chọn nhân viên</option>
                            {staffList.map((member) => (
                                <option key={member.id} value={member.id}>{`${member.name} · ${member.roleLabel}`}</option>
                            ))}
                        </select>
                    </FormField>
                    <FormField id={MONTH_ID} label="Tháng" required>
                        <select id={MONTH_ID} className="input num" value={month} onChange={(event) => changeMonth(event.target.value)}>
                            {months.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField id={FROM_ID} label="Từ ngày" required>
                        <input
                            id={FROM_ID}
                            type="date"
                            className="input"
                            min={today}
                            value={range.from}
                            onChange={(event) => changeRange("from", event.target.value)}
                        />
                    </FormField>
                    <FormField id={TO_ID} label="Đến ngày" required error={errors.to}>
                        <input
                            id={TO_ID}
                            type="date"
                            className="input"
                            min={range.from || today}
                            aria-invalid={Boolean(errors.to)}
                            aria-describedby={errors.to ? `${TO_ID}-error` : undefined}
                            value={range.to}
                            onChange={(event) => changeRange("to", event.target.value)}
                        />
                    </FormField>
                </div>

                <div className="field">
                    <span className="label">Lịch lặp lại hằng tuần</span>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th scope="col">Thứ</th>
                                    {SHIFT_SLOT_OPTIONS.map((slot) => (
                                        <th key={slot.value} scope="col" className="num">
                                            {`${slot.label} · ${slot.start}–${slot.end}`}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {WEEKDAY_NAMES.map((name, weekday) => (
                                    <tr key={name}>
                                        <th scope="row" className="whitespace-nowrap text-left font-semibold text-ink">
                                            {name}
                                        </th>
                                        {SHIFT_SLOT_OPTIONS.map((slot) => {
                                            const value = pattern[weekday][slot.value];
                                            return (
                                                <td key={slot.value} className="py-1.5">
                                                    <select
                                                        className={cx("input h-9", !value && "bg-surface-tint text-placeholder")}
                                                        aria-label={`${name}, ${slot.label}`}
                                                        disabled={!staff}
                                                        value={value}
                                                        onChange={(event) => changePattern(weekday, slot.value, event.target.value)}
                                                    >
                                                        <option value="">Không làm</option>
                                                        {rooms.map((room) => (
                                                            <option key={room.id} value={room.id}>
                                                                {room.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {staff && previewResult && (
                    <div className="rounded-md bg-info-soft px-4 py-3" role="status">
                        <p className="num font-semibold text-primary">
                            Sẽ tạo {count} ca cho {staff.name} trong tháng {monthLabel}
                        </p>
                        {skippedText(previewResult) && <p className="num mt-0.5 text-body">{skippedText(previewResult)}</p>}
                    </div>
                )}

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving || (staff && count === 0)}>
                        {saving ? "Đang phân ca…" : "Phân ca"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default MonthlyShiftPopup;
