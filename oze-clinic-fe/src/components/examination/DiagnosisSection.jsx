import { Plus, Trash2 } from "lucide-react";
import { displayText } from "@/utils/medicalRecord";
import ClinicalExamSection from "./ClinicalExamSection";

// "Chẩn đoán xác định": final diagnoses. items: [{ id, code (ICD-10), name, teeth }]. onAdd opens the picker (owned by the parent).
const DiagnosisSection = ({ items = [], onAdd, onRemove }) => (
    <ClinicalExamSection
        title="Chẩn đoán xác định"
        flush
        action={
            onAdd && (
                <button type="button" className="btn btn-secondary h-8 px-3 text-caption" onClick={onAdd}>
                    <Plus className="size-4" aria-hidden="true" />
                    Thêm chẩn đoán
                </button>
            )
        }
    >
        {items.length === 0 ? (
            <p className="px-5 py-6 text-center text-muted">Chưa có chẩn đoán. Cần ít nhất một chẩn đoán để hoàn thành bước khám.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th scope="col">Mã ICD</th>
                            <th scope="col">Chẩn đoán</th>
                            <th scope="col">Răng</th>
                            {onRemove && (
                                <th scope="col">
                                    <span className="sr-only">Thao tác</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td className="num font-semibold text-ink">{displayText(item.code)}</td>
                                <td className="min-w-56">{displayText(item.name)}</td>
                                <td className="num">{displayText(item.teeth || null)}</td>
                                {onRemove && (
                                    <td className="w-12 text-right">
                                        <button
                                            type="button"
                                            className="btn btn-icon size-8 bg-transparent text-muted hover:bg-danger-soft hover:text-danger"
                                            aria-label={`Xoá chẩn đoán ${item.code}`}
                                            onClick={() => onRemove(item.id)}
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </ClinicalExamSection>
);

export default DiagnosisSection;
