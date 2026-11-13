import { treatmentItemsTotal } from "@/utils/examination";
import { formatNumber } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

const money = (amount) => `${formatNumber(amount)} ₫`;

// "Hoá đơn buổi này": every treatment item of the session with its price, then the total.
const SessionInvoiceCard = ({ items = [] }) => (
    <ClinicalExamSection title="Hoá đơn buổi này" bodyClassName="flex flex-col gap-3">
        {items.length === 0 ? (
            <p className="text-body-sm text-muted">Chưa có nội dung điều trị.</p>
        ) : (
            <ul className="flex flex-col gap-2 text-body-sm">
                {items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                        <span className="min-w-0 text-body">{item.content}</span>
                        <span className="num shrink-0 font-medium text-ink">{money(item.price)}</span>
                    </li>
                ))}
            </ul>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
            <span className="font-semibold text-ink">Tổng tiền</span>
            <span className="num text-body-lg font-semibold text-ink">{money(treatmentItemsTotal(items))}</span>
        </div>
    </ClinicalExamSection>
);

export default SessionInvoiceCard;
