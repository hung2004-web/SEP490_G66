import { treatmentItemsTotal } from "@/utils/examination";
import { formatNumber } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

// "Hoá đơn buổi này": how many treatment items and their total. Reception takes the payment after the visit.
const SessionInvoiceCard = ({ items = [] }) => (
    <ClinicalExamSection title="Hoá đơn buổi này" bodyClassName="flex flex-col gap-2.5">
        <dl className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Số nội dung</dt>
                <dd className="num font-medium text-ink">{items.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Tổng tiền</dt>
                <dd className="num text-body-lg font-semibold text-ink">{formatNumber(treatmentItemsTotal(items))} ₫</dd>
            </div>
        </dl>
        <p className="text-caption text-muted">Lễ tân thu tiền khi kết thúc khám.</p>
    </ClinicalExamSection>
);

export default SessionInvoiceCard;
