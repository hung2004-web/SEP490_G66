import { cx } from "@/utils/cx";
import { dateRangeText, planSummary } from "@/utils/examination";
import { formatDayMonth, formatNumber } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

const money = (amount) => `${formatNumber(amount)} ₫`;

const Stat = ({ label, value, className }) => (
    <div className={cx("flex flex-col-reverse gap-0.5 rounded-lg bg-surface-tint px-3 py-2", className)}>
        <dt className="text-caption text-muted">{label}</dt>
        <dd className="num font-semibold text-ink">{value}</dd>
    </div>
);

// Dot of a session on the timeline: done (filled green), dated (filled blue) or not dated yet (hollow).
const dotTone = (session) => (session.status === "done" ? "border-success-solid bg-success-solid" : session.date ? "border-primary bg-primary" : "border-border-strong bg-canvas");

// "Tóm tắt kế hoạch": quick numbers, then the schedule of every session grouped by service in treatment order
// (date, content, cost), then the estimated total.
const PlanSummaryCard = ({ services = [] }) => {
    const summary = planSummary(services);

    return (
        <ClinicalExamSection title="Tóm tắt kế hoạch" bodyClassName="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-2">
                <Stat label="Dịch vụ" value={summary.serviceCount} />
                <Stat label="Buổi điều trị" value={summary.sessionCount} />
                <Stat className="col-span-2" label="Thời gian dự kiến" value={dateRangeText(summary.from, summary.to) || "Chưa có ngày"} />
            </dl>

            {services.length > 0 && (
                <ol className="flex flex-col gap-4" aria-label="Lịch trình điều trị">
                    {services.map((service, index) => (
                        <li key={service.id} className="flex flex-col gap-2">
                            <p className="flex items-baseline justify-between gap-3">
                                <span className="min-w-0 text-caption font-semibold tracking-wide text-muted uppercase">
                                    {index + 1}. {service.name}
                                </span>
                                <span className="num shrink-0 text-body-sm font-medium text-ink">{money(summary.perService[index].cost)}</span>
                            </p>
                            {service.sessions.length === 0 ? (
                                <p className="text-caption text-muted">Chưa có buổi nào.</p>
                            ) : (
                                <ol className="flex flex-col">
                                    {service.sessions.map((session, sessionIndex) => (
                                        <li key={session.id} className="relative flex gap-3 pb-3 last:pb-0">
                                            {sessionIndex < service.sessions.length - 1 && (
                                                <span aria-hidden="true" className="absolute top-3.5 bottom-0 left-[5px] w-px bg-border" />
                                            )}
                                            <span aria-hidden="true" className={cx("relative mt-1 size-[11px] shrink-0 rounded-full border-2", dotTone(session))} />
                                            <div className="flex min-w-0 flex-1 flex-col text-body-sm">
                                                <span className="num text-caption font-medium text-muted">
                                                    {session.date ? formatDayMonth(session.date) : "Chưa có ngày"}
                                                    {session.status === "done" && " · Đã thực hiện"}
                                                </span>
                                                <span className="text-ink">
                                                    Buổi {sessionIndex + 1}
                                                    {session.title.trim() ? ` · ${session.title.trim()}` : ""}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
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
