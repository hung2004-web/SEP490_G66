import { Plus } from "lucide-react";
import { treatmentItemsTotal } from "@/utils/examination";
import { formatNumber } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";
import RowActions from "./RowActions";

const money = (amount) => `${formatNumber(amount)} ₫`;

// "Nội dung điều trị": what was done in this session, with its price, plus the total.
// items: [{ id, content, price, createdAt }]. onAdd / onEdit(item) / onRemove(item) open the dialogs (owned by the parent).
// Without onAdd / onEdit / onRemove (e.g. a finished visit) the list is read-only.
const TreatmentItemTable = ({ items = [], onAdd, onEdit, onRemove }) => {
    const editable = Boolean(onEdit || onRemove);

    return (
        <ClinicalExamSection
            title="Nội dung điều trị"
            action={
                onAdd && (
                    <button type="button" className="btn btn-primary" onClick={onAdd}>
                        <Plus className="size-4" aria-hidden="true" />
                        Thêm nội dung điều trị
                    </button>
                )
            }
            flush
            className="overflow-hidden"
        >
            {items.length === 0 ? (
                <p className="px-5 py-6 text-center text-muted">Chưa có nội dung nào. Thêm những gì đã làm trong buổi để tính vào hoá đơn.</p>
            ) : (
                <div className="table-wrap rounded-none border-0">
                    <table className="table table-stack-sm [&_td]:px-5 [&_th]:px-5">
                        <thead>
                            <tr>
                                <th scope="col">Nội dung</th>
                                <th scope="col" className="w-36 text-right">
                                    Giá tiền
                                </th>
                                {editable && (
                                    <th scope="col" className="w-24">
                                        <span className="sr-only">Thao tác</span>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td data-primary className="py-3 text-body-sm text-ink">
                                        {item.content}
                                    </td>
                                    <td data-label="Giá tiền" className="num text-right font-semibold whitespace-nowrap text-ink">
                                        {money(item.price)}
                                    </td>
                                    {editable && (
                                        <td data-actions className="text-right whitespace-nowrap">
                                            <RowActions label={item.content} onEdit={onEdit && (() => onEdit(item))} onRemove={onRemove && (() => onRemove(item))} />
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {items.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-tint px-5 py-3">
                    <span className="font-semibold text-ink">Tổng</span>
                    <span className="num font-bold text-ink">{money(treatmentItemsTotal(items))}</span>
                </div>
            )}
        </ClinicalExamSection>
    );
};

export default TreatmentItemTable;
