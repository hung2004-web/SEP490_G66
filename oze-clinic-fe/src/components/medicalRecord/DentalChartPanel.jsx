import { cx } from "@/utils/cx";
import { LOWER_TEETH, UPPER_TEETH, displayText, isPermanentTooth, surfaceText, toToothCode, toothName } from "@/utils/medicalRecord";
import { MEDICAL_RECORD_TOOTH_KIND, MEDICAL_RECORD_TOOTH_STATUS } from "@/utils/messages";
import { DentalLegend, JawLabel, ToothRow } from "./DentalChartParts";
import RecordStatusBadge from "./RecordStatusBadge";

const ROW_FOCUS_CLASS = "focus-visible:shadow-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

const DentalChartPanel = ({ entries, selectedTooth, onSelectTooth }) => {
    const toothCount = new Set(entries.map((entry) => String(entry.tooth))).size;
    const selectByKey = (event, tooth) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectTooth(tooth);
    };

    return (
        <div className="flex flex-col gap-4">
            <section className="card-app p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <h2 className="card-title">Sơ đồ răng buổi này</h2>
                    <span className="text-caption text-muted">{toothCount} răng được ghi nhận</span>
                </div>
                <div className="p-5">
                    <JawLabel name="HÀM TRÊN" />
                    <ToothRow teeth={UPPER_TEETH} entries={entries} selectedTooth={selectedTooth} onSelect={onSelectTooth} />
                    <div className="my-2.5 border-t-2 border-dashed border-border" />
                    <ToothRow teeth={LOWER_TEETH} entries={entries} selectedTooth={selectedTooth} onSelect={onSelectTooth} />
                    <JawLabel name="HÀM DƯỚI" />
                </div>
                <DentalLegend entries={entries} className="border-t border-border px-5 pb-4 pt-3" />
            </section>
            <section className="card-app p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <h2 className="card-title">Ghi nhận trong buổi</h2>
                    <span className="num text-caption text-muted">{entries.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Răng</th>
                                <th>Mặt răng</th>
                                <th>Ghi nhận</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => {
                                const tooth = toToothCode(entry.tooth);
                                const selectable = isPermanentTooth(tooth);
                                const selected = selectable && tooth === selectedTooth;
                                return (
                                    <tr
                                        key={entry.id ?? index}
                                        tabIndex={selectable ? 0 : undefined}
                                        className={cx(selectable && "cursor-pointer", ROW_FOCUS_CLASS, selected && "bg-primary-soft")}
                                        onClick={selectable ? () => onSelectTooth(tooth) : undefined}
                                        onKeyDown={selectable ? (event) => selectByKey(event, tooth) : undefined}
                                    >
                                        <td className={cx("py-2", selected && "border-l-3 border-l-primary")}>
                                            <b className="text-ink">{displayText(entry.tooth)}</b>
                                            <p className="text-caption text-muted">{toothName(tooth)}</p>
                                        </td>
                                        <td className="text-caption">{entry.surf ? surfaceText(entry.surf) : "Cả răng"}</td>
                                        <td className="py-2">
                                            {MEDICAL_RECORD_TOOTH_KIND[entry.kind] ?? displayText(entry.kind)}
                                            <p className="text-caption text-muted">{displayText(entry.note)}</p>
                                        </td>
                                        <td>
                                            <RecordStatusBadge status={entry.st} labels={MEDICAL_RECORD_TOOTH_STATUS} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default DentalChartPanel;
