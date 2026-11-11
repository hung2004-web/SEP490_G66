import { planSummary } from "@/utils/examination";
import { formatNumber } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

const money = (amount) => `${formatNumber(amount)} ₫`;

// "Tóm tắt kế hoạch": each service in treatment order with its total cost and the treatment content of its sessions,
// then the estimated total.
const PlanSummaryCard = ({ services = [] }) => {
    const summary = planSummary(services);

    return (
        <ClinicalExamSection title="Tóm tắt kế hoạch" bodyClassName="flex flex-col gap-4">
            {services.length > 0 && (
                <ol className="flex flex-col gap-4">
                    {services.map((service, index) => (
                        <li key={service.id} className="flex flex-col gap-1.5">
                            <p className="flex items-baseline justify-between gap-3">
                                <span className="min-w-0 font-semibold text-ink">
                                    {index + 1}. {service.name}
                                </span>
                                <span className="num shrink-0 font-semibold text-ink">{money(summary.perService[index].cost)}</span>
                            </p>
                            {service.sessions.length === 0 ? (
                                <p className="text-caption text-muted">Chưa có buổi nào.</p>
                            ) : (
                                <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-body marker:text-muted">
                                    {service.sessions.map((session, sessionIndex) => (
                                        <li key={session.id}>{session.title.trim() || `Buổi ${sessionIndex + 1} · chưa nhập nội dung`}</li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ol>
            )}

            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
                <span className="font-semibold text-ink">Dự kiến kinh phí</span>
                <span className="num font-heading text-heading-2 text-ink">{money(summary.total)}</span>
            </div>
        </ClinicalExamSection>
    );
};

export default PlanSummaryCard;
