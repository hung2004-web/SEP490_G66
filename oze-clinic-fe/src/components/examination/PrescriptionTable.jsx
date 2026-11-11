import { Fragment } from "react";
import { Plus, Sparkles } from "lucide-react";
import { cx } from "@/utils/cx";
import { quantityText, usageText } from "@/utils/examination";
import ClinicalExamSection from "./ClinicalExamSection";

const linkButton = "cursor-pointer rounded text-body-sm font-medium outline-none hover:underline focus-visible:shadow-focus";

// "Đơn thuốc": the medicines prescribed in this visit.
// items: [{ id, medicationName, dosage, frequency, duration, quantity, instructions }] (PrescriptionItems).
// warnings: { [itemId]: message } from the AI check (e.g. "Bệnh nhân dị ứng Penicillin."). A warned medicine gets a red row
// and the message under it; it is advice only, the prescription can still be saved.
// onAdd / onEdit(item) / onRemove(item) open the dialogs (owned by the parent); without them the list is read-only.
const PrescriptionTable = ({ items = [], warnings = {}, onAdd, onEdit, onRemove }) => {
    const editable = Boolean(onEdit || onRemove);
    const columns = editable ? 4 : 3;

    return (
        <ClinicalExamSection
            title="Đơn thuốc"
            badge={<span className="num rounded-full bg-surface-tint px-2 py-0.5 text-caption font-medium text-muted">{items.length}</span>}
            action={
                onAdd && (
                    <button type="button" className={cx(linkButton, "inline-flex items-center gap-1.5 font-semibold text-primary")} onClick={onAdd}>
                        <Plus className="size-4" aria-hidden="true" />
                        Thêm thuốc
                    </button>
                )
            }
            flush
            className="overflow-hidden"
        >
            {items.length === 0 ? (
                <p className="px-5 py-6 text-center text-muted">Chưa có thuốc nào. Bấm "Thêm thuốc" để kê đơn, hoặc kết thúc lượt khám nếu không cần thuốc.</p>
            ) : (
                <div className="table-wrap rounded-none border-0">
                    <table className="table table-stack-sm">
                        <thead>
                            <tr>
                                <th scope="col">Tên thuốc · hàm lượng</th>
                                <th scope="col" className="w-28">
                                    Số lượng
                                </th>
                                <th scope="col">Cách dùng</th>
                                {editable && (
                                    <th scope="col" className="w-28">
                                        <span className="sr-only">Thao tác</span>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const warning = warnings[item.id];
                                return (
                                    <Fragment key={item.id}>
                                        <tr className={cx(warning && "bg-danger-soft hover:bg-danger-soft")}>
                                            <td data-primary className="py-3">
                                                <span className="block font-semibold text-ink">{item.medicationName}</span>
                                                {item.dosage && <span className="block text-caption text-muted">{item.dosage}</span>}
                                            </td>
                                            <td data-label="Số lượng" className="num whitespace-nowrap">
                                                {quantityText(item)}
                                            </td>
                                            <td data-label="Cách dùng" className="min-w-40">
                                                {usageText(item)}
                                            </td>
                                            {editable && (
                                                <td data-actions className="text-right whitespace-nowrap">
                                                    <span className="inline-flex gap-3">
                                                        {onEdit && (
                                                            <button type="button" className={`${linkButton} text-primary`} aria-label={`Sửa: ${item.medicationName}`} onClick={() => onEdit(item)}>
                                                                Sửa
                                                            </button>
                                                        )}
                                                        {onRemove && (
                                                            <button type="button" className={`${linkButton} text-danger`} aria-label={`Xoá: ${item.medicationName}`} onClick={() => onRemove(item)}>
                                                                Xoá
                                                            </button>
                                                        )}
                                                    </span>
                                                </td>
                                            )}
                                        </tr>
                                        {warning && (
                                            // Stacked (narrow) layout: no line between the medicine and its warning, they read as one card.
                                            <tr className="border-t-0! bg-danger-soft pt-0! hover:bg-danger-soft">
                                                <td colSpan={columns} className="h-auto py-2.5 text-left!">
                                                    <span className="flex items-start gap-2 text-caption font-semibold text-danger">
                                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-canvas px-1.5 py-px text-caption font-semibold text-danger">
                                                            <Sparkles className="size-3" aria-hidden="true" />
                                                            AI
                                                            <span className="sr-only">cảnh báo:</span>
                                                        </span>
                                                        <span className="min-w-0">{warning}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </ClinicalExamSection>
    );
};

export default PrescriptionTable;
