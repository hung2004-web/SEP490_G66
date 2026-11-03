import { formatShiftDate } from "@/services/shiftService";

// Bordered label / value list at the top of the shift popups. rows: [{ label, value }]; an empty value shows "—".
const ShiftInfoTable = ({ rows }) => (
    <dl className="overflow-hidden rounded-lg border border-border">
        {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
                <dt className="text-muted">{row.label}</dt>
                <dd className="text-ink">{row.value || "—"}</dd>
            </div>
        ))}
    </dl>
);

// "Ngày / Ca / Phòng" of a shift, shared by the assign, edit and replace popups.
export const ShiftPlaceTable = ({ cell }) => (
    <ShiftInfoTable
        rows={[
            { label: "Ngày", value: <span className="num">{formatShiftDate(cell.date)}</span> },
            { label: "Ca", value: <span className="num font-medium">{`${cell.slotLabel} · ${cell.start} – ${cell.end}`}</span> },
            { label: "Phòng", value: cell.room.name },
        ]}
    />
);

export default ShiftInfoTable;
