import { cx } from "@/utils/cx";
import { ROOM_TYPE_OPTIONS, ROOM_TYPES } from "@/utils/data/mockRooms";
import { SHIFT_STATUSES } from "@/utils/data/mockShifts";
import { ShiftStatusText } from "./ShiftStatus";

// Card border per room type; the legend under the grid uses the same colours.
const ROOM_TYPE_BORDERS = {
    [ROOM_TYPES.GENERAL]: "border-chart-1",
    [ROOM_TYPES.MINOR_SURGERY]: "border-warning-solid",
    [ROOM_TYPES.SPECIALIZED]: "border-chart-7",
    [ROOM_TYPES.XRAY]: "border-success-solid",
    [ROOM_TYPES.RECEPTION]: "border-neutral",
};

const EMPTY_LOOK = "border-dashed border-danger-solid bg-danger-soft";
const LEAVE_LOOK = "border-dashed border-warning-solid bg-warning-soft";

const cardLabel = (cell, emptyText) => {
    const who = cell.staff ? cell.staff.name : emptyText;
    return `${cell.room.name}, ${cell.slotLabel} ${cell.date}: ${who}`;
};

// One room of one shift. In an editable week an empty card invites assigning and a person on leave needs a replacement.
const ShiftCard = ({ cell, editable, onClick }) => {
    const empty = cell.status === SHIFT_STATUSES.UNASSIGNED;
    const needsReplacement = editable && cell.status === SHIFT_STATUSES.LEAVE;
    const emptyText = editable ? "+ Chưa phân ca" : "Không có người trực";

    return (
        <button
            type="button"
            aria-label={cardLabel(cell, emptyText)}
            onClick={() => onClick(cell)}
            className={cx(
                "w-full cursor-pointer rounded-md border-[1.5px] px-2.5 py-1.5 text-left transition-shadow duration-150 hover:shadow-md",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                empty ? EMPTY_LOOK : needsReplacement ? LEAVE_LOOK : cx("bg-canvas", ROOM_TYPE_BORDERS[cell.room.type]),
            )}
        >
            <span className={cx("block text-caption leading-tight", empty ? "text-danger" : "text-muted")}>{cell.room.name}</span>
            {empty ? (
                <span className="block text-caption font-semibold text-danger">{emptyText}</span>
            ) : (
                <span className="block truncate text-label font-semibold text-ink">{cell.staff.name}</span>
            )}
            {!empty && <ShiftStatusText status={cell.status} />}
        </button>
    );
};

const LegendItem = ({ className, children }) => (
    <span className="flex items-center gap-1.5">
        <span className={cx("size-3 rounded-sm border-[1.5px]", className)} aria-hidden="true" />
        {children}
    </span>
);

// Week schedule: one column per day, one row per shift, a card per room. cells come from getWeekShifts;
// isVisible(cell) hides cards that do not match the filters; onSelect(cell) runs when a card is clicked.
const ShiftWeekGrid = ({ week, isVisible, onSelect }) => {
    const cellsOf = (date, slot) => week.cells.filter((cell) => cell.date === date && cell.slot === slot && isVisible(cell));

    return (
        <section className="card-app flex flex-col gap-3 p-4" aria-label={`Lịch phân ca ${week.label}`}>
            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[1080px] table-fixed border-collapse">
                    <colgroup>
                        <col className="w-32" />
                        {week.days.map((day) => (
                            <col key={day.date} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr className="bg-surface-tint">
                            <th scope="col" className="px-3 py-3 text-left align-top text-label font-semibold text-muted">
                                Ca
                            </th>
                            {week.days.map((day) => (
                                <th
                                    key={day.date}
                                    scope="col"
                                    className={cx("border-l border-border px-2 py-2.5 text-center", day.isToday ? "bg-primary-soft text-primary" : "text-ink")}
                                >
                                    <span className={cx("block text-caption font-normal", !day.isToday && "text-muted")}>{day.weekday}</span>
                                    <span className="num block font-heading text-heading-3">{day.label}</span>
                                    {day.isToday && <span className="block text-caption font-medium">Hôm nay</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {week.slots.map((slot) => (
                            <tr key={slot.value} className="border-t border-border">
                                <th scope="row" className="px-3 py-3 text-left align-top font-normal">
                                    <span className="block text-title text-ink">{slot.label}</span>
                                    <span className="num block text-caption text-muted">{`${slot.start} – ${slot.end}`}</span>
                                </th>
                                {week.days.map((day) => (
                                    <td key={day.date} className={cx("border-l border-border p-2 align-top", day.isToday && "bg-primary-softer")}>
                                        <div className="flex flex-col gap-1.5">
                                            {cellsOf(day.date, slot.value).map((cell) => (
                                                <ShiftCard key={cell.key} cell={cell} editable={week.editable} onClick={onSelect} />
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-caption text-muted">
                {ROOM_TYPE_OPTIONS.map((option) => (
                    <LegendItem key={option.value} className={ROOM_TYPE_BORDERS[option.value]}>
                        {option.label}
                    </LegendItem>
                ))}
                <LegendItem className="border-dashed border-danger-solid">{week.editable ? "Chưa phân ca" : "Không có người trực"}</LegendItem>
                {week.editable && <LegendItem className="border-dashed border-warning-solid">Nghỉ phép</LegendItem>}
            </div>
            {week.maintenanceRooms.length > 0 && (
                <p className="text-caption text-muted">{week.maintenanceRooms.join(", ")} đang bảo trì, không phân ca.</p>
            )}
        </section>
    );
};

export default ShiftWeekGrid;
