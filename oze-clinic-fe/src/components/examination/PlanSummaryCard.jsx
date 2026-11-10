import { dateRangeText, planSummary } from "@/utils/examination";
import { formatNumber } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

const money = (amount) => `${formatNumber(amount)} ₫`;

// "Tóm tắt kế hoạch": counts, planned period, order of the services with their cost, estimated total.
const PlanSummaryCard = ({ services = [] }) => {
    const summary = planSummary(services);

    return (
        <ClinicalExamSection title="Tóm tắt kế hoạch" bodyClassName="flex flex-col gap-4">
            <dl className="flex flex-col gap-2 text-body-sm">
                {[
                    ["Số dịch vụ", summary.serviceCount],
                    ["Tổng số buổi", summary.sessionCount],
                    ["Thời gian dự kiến", dateRangeText(summary.from, summary.to) || "Chưa có ngày"],
                ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                        <dt className="min-w-0 text-body">{label}</dt>
                        <dd className="num shrink-0 text-right font-medium whitespace-nowrap text-ink">{value}</dd>
                    </div>
                ))}
            </dl>

            {summary.perService.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="font-semibold text-ink">Thứ tự thực hiện</p>
                    <ol className="flex flex-col gap-1.5 text-body-sm">
                        {summary.perService.map((service, index) => (
                            <li key={service.id} className="flex justify-between gap-3">
                                <span className="min-w-0 text-body">
                                    {index + 1}. {service.name} · {service.sessionCount} buổi
                                </span>
                                <span className="num shrink-0 font-medium text-ink">{money(service.cost)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
                <span className="font-semibold text-ink">Dự kiến kinh phí</span>
                <span className="num font-heading text-heading-2 text-ink">{money(summary.total)}</span>
            </div>
        </ClinicalExamSection>
    );
};

export default PlanSummaryCard;
