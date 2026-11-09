import { cx } from "@/utils/cx";
import { surfacesText } from "@/utils/examination";
import ClinicalExamSection from "./ClinicalExamSection";

const linkButton = "cursor-pointer rounded text-caption font-semibold outline-none hover:underline focus-visible:shadow-focus";

// "Tình trạng răng hiện tại": findings of this visit grouped by tooth (number shown on the tooth's first row).
// entries: [{ id, tooth, condition, surfaces, note }].
const ToothConditionTable = ({ entries = [], selectedTooth, onSelectTooth, onEdit, onRemove }) => {
    const sorted = [...entries].sort((a, b) => Number(a.tooth) - Number(b.tooth));
    const toothCount = new Set(entries.map((entry) => Number(entry.tooth))).size;

    return (
        <ClinicalExamSection
            title="Tình trạng răng hiện tại"
            action={
                entries.length > 0 && (
                    <span className="num rounded-full bg-surface-tint px-2 py-0.5 text-[11px] font-medium text-body">
                        {entries.length} tình trạng · {toothCount} răng
                    </span>
                )
            }
        >
            {sorted.length === 0 ? (
                <p className="py-2 text-center text-muted">Chưa có ghi nhận nào. Bấm vào răng trên sơ đồ để thêm.</p>
            ) : (
                <div className="relative overflow-x-auto rounded-lg border border-border">
                    <table className="table">
                        <thead>
                            <tr>
                                <th scope="col">Răng</th>
                                <th scope="col">Tình trạng</th>
                                <th scope="col">Mặt răng</th>
                                <th scope="col">Mô tả</th>
                                <th scope="col">
                                    <span className="sr-only">Thao tác</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((entry, index) => {
                                const tooth = Number(entry.tooth);
                                const firstOfTooth = index === 0 || Number(sorted[index - 1].tooth) !== tooth;
                                return (
                                    <tr key={entry.id} aria-selected={tooth === selectedTooth}>
                                        <td className={cx("w-16", !firstOfTooth && "border-t-transparent")}>
                                            {firstOfTooth && (
                                                <button
                                                    type="button"
                                                    className="num cursor-pointer rounded font-semibold text-ink outline-none hover:text-primary focus-visible:shadow-focus"
                                                    aria-label={`Chọn răng ${tooth} trên sơ đồ`}
                                                    onClick={() => onSelectTooth?.(tooth)}
                                                >
                                                    {tooth}
                                                </button>
                                            )}
                                        </td>
                                        <td className="min-w-32">{entry.condition}</td>
                                        <td className="num whitespace-nowrap">{surfacesText(entry.surfaces)}</td>
                                        <td className="min-w-56 text-caption">{entry.note || "—"}</td>
                                        <td className="whitespace-nowrap text-right">
                                            <span className="inline-flex gap-3">
                                                <button type="button" className={`${linkButton} text-primary`} onClick={() => onEdit?.(entry)}>
                                                    Sửa
                                                </button>
                                                <button type="button" className={`${linkButton} text-danger`} onClick={() => onRemove?.(entry)}>
                                                    Xoá
                                                </button>
                                            </span>
                                        </td>
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
