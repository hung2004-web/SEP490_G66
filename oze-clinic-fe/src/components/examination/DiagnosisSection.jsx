import { icdName } from "@/utils/examination";
import ClinicalExamSection from "./ClinicalExamSection";

const linkButton = "cursor-pointer rounded text-caption font-semibold outline-none hover:underline focus-visible:shadow-focus";

// "Chẩn đoán xác định": final diagnoses. items: [{ id, code (ICD-10), teeth: ["36"], note }].
// onAdd / onEdit open the diagnosis dialog (owned by the parent).
const DiagnosisSection = ({ items = [], onAdd, onEdit, onRemove }) => (
    <ClinicalExamSection
        title="Chẩn đoán xác định"
        action={
            onAdd && (
                <button type="button" className={`${linkButton} text-body-sm text-primary`} onClick={onAdd}>
                    + Thêm chẩn đoán
                </button>
            )
        }
    >
        {items.length === 0 ? (
            <p className="py-2 text-center text-muted">Chưa có chẩn đoán. Cần ít nhất một chẩn đoán để chuyển sang lập kế hoạch điều trị.</p>
        ) : (
            <div className="relative overflow-x-auto rounded-lg border border-border">
                <table className="table">
                    <thead>
                        <tr>
                            <th scope="col">Mã ICD-10</th>
                            <th scope="col">Răng liên quan</th>
                            <th scope="col">Mô tả chi tiết</th>
                            <th scope="col">
                                <span className="sr-only">Thao tác</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td className="min-w-36">
                                    <b className="num font-semibold text-ink">{item.code}</b>
                                    <p className="text-caption text-muted">{icdName(item.code)}</p>
                                </td>
                                <td>
                                    {item.teeth.length ? (
                                        <span className="flex flex-wrap gap-1">
                                            {item.teeth.map((tooth) => (
                                                <span key={tooth} className="num rounded-md bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">
                                                    {tooth}
                                                </span>
                                            ))}
                                        </span>
                                    ) : (
                                        "—"
                                    )}
                                </td>
                                <td className="min-w-56">{item.note || "—"}</td>
                                <td className="whitespace-nowrap text-right">
                                    <span className="inline-flex gap-3">
                                        {onEdit && (
                                            <button type="button" className={`${linkButton} text-primary`} onClick={() => onEdit(item)}>
                                                Sửa
                                            </button>
                                        )}
                                        {onRemove && (
                                            <button type="button" className={`${linkButton} text-danger`} onClick={() => onRemove(item)}>
                                                Xoá
                                            </button>
                                        )}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </ClinicalExamSection>
);

export default DiagnosisSection;
