import RecordStatusBadge from "@/components/medicalRecord/RecordStatusBadge";
import { cx } from "@/utils/cx";
import { displayText, surfaceText, toToothCode, toothName } from "@/utils/medicalRecord";
import { MEDICAL_RECORD_TOOTH_KIND, MEDICAL_RECORD_TOOTH_STATUS } from "@/utils/messages";
import ClinicalExamSection from "./ClinicalExamSection";

const ROW_FOCUS_CLASS = "focus-visible:shadow-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

// "Tình trạng răng hiện tại": the findings recorded on the chart. Clicking a row opens it in the editor.
const ToothConditionTable = ({ entries = [], selectedTooth, onSelectEntry }) => {
    const sorted = [...entries].sort((a, b) => toToothCode(a.tooth) - toToothCode(b.tooth));
    const selectByKey = (event, entry) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectEntry?.(entry);
    };

    return (
        <ClinicalExamSection title="Tình trạng răng hiện tại" action={<span className="num text-caption text-muted">{entries.length} ghi nhận</span>} bodyClassName="p-0">
            {sorted.length === 0 ? (
                <p className="px-5 py-6 text-center text-muted">Chưa có ghi nhận nào. Bấm vào răng trên sơ đồ để thêm.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th scope="col">Răng</th>
                                <th scope="col">Tình trạng</th>
                                <th scope="col">Mặt răng</th>
                                <th scope="col">Trạng thái</th>
                                <th scope="col">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((entry, index) => {
                                const tooth = toToothCode(entry.tooth);
                                const selected = tooth === selectedTooth;
                                return (
                                    <tr
                                        key={entry.id ?? index}
                                        tabIndex={0}
                                        aria-selected={selected}
                                        className={cx("cursor-pointer", ROW_FOCUS_CLASS)}
                                        onClick={() => onSelectEntry?.(entry)}
                                        onKeyDown={(event) => selectByKey(event, entry)}
                                    >
                                        <td className={cx("py-2", selected && "border-l-3 border-l-primary")}>
                                            <b className="num text-ink">{displayText(entry.tooth)}</b>
                                            <p className="text-caption text-muted">{toothName(tooth)}</p>
                                        </td>
                                        <td>{MEDICAL_RECORD_TOOTH_KIND[entry.kind] ?? displayText(entry.kind)}</td>
                                        <td className="text-caption">{entry.surf ? surfaceText(entry.surf) : "Cả răng"}</td>
                                        <td>
                                            <RecordStatusBadge status={entry.st} labels={MEDICAL_RECORD_TOOTH_STATUS} />
                                        </td>
                                        <td className="min-w-48 text-caption">{displayText(entry.note || null)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </ClinicalExamSection>
    );
};

export default ToothConditionTable;
