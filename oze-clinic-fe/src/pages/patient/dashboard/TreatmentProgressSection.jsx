import { Stethoscope } from "lucide-react";
import DashboardSection from "@/components/dashboard/DashboardSection";
import { cx } from "@/utils/cx";
import { formatDate } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE, TREATMENT_STAGE_STATUS } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const TITLE_ID = "patient-dashboard-progress";
const PLAN_TITLE_ID = "patient-dashboard-progress-plan";

const StageBadge = ({ status }) => {
    const meta = TREATMENT_STAGE_STATUS[status];
    return meta ? <span className={cx("badge", meta.badge)}>{meta.label}</span> : null;
};

const TreatmentProgressSection = ({ plan = null, progress = null, loading = false, failed = false }) => {
    const loaded = !loading && !failed;
    const stages = plan?.stages ?? [];
    const total = progress?.y ?? 0;
    const completed = progress?.completed ?? 0;
    const completedText = `Hoàn thành ${completed}/${total} giai đoạn`;
    const isCurrent = (stage) => progress?.currentStageId != null && stage.id === progress.currentStageId;

    return (
        <DashboardSection
            id={TITLE_ID}
            title="Tiến trình điều trị"
            busy={loading}
            link={loaded && plan && { to: ROUTES.TREATMENT_PLANS, label: "Xem kế hoạch" }}
            error={!loading && failed && GENERIC_ERROR_MESSAGE}
            empty={loaded && !plan && { icon: Stethoscope, text: "Bạn chưa có kế hoạch điều trị đang thực hiện." }}
        >
            {loading && (
                <div aria-hidden="true" className="flex flex-col gap-4">
                    <div className="skeleton h-2" />
                    <div className="skeleton h-12" />
                    <div className="skeleton h-12" />
                    <div className="skeleton h-12" />
                    <div className="skeleton h-12" />
                </div>
            )}
            {loaded && plan && (
                <>
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div className="min-w-0">
                            <h3 id={PLAN_TITLE_ID} className="card-title">
                                {plan.planName}
                            </h3>
                            <p className="num mt-1 text-body-sm text-muted">
                                {[plan.doctorName, plan.startDate && `Bắt đầu ${formatDate(plan.startDate)}`].filter(Boolean).join(" · ")}
                            </p>
                        </div>
                        {total > 0 && <p className="num text-body-sm text-ink">{completedText}</p>}
                    </div>
                    {total > 0 && (
                        <div
                            role="progressbar"
                            aria-labelledby={PLAN_TITLE_ID}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress.percent}
                            aria-valuetext={completedText}
                            className="flex h-2 overflow-hidden rounded-full"
                        >
                            {Array.from({ length: total }, (_, index) => (
                                <span key={index} className={cx("flex-1", index < completed ? "bg-primary" : "bg-surface-muted")} />
                            ))}
                        </div>
                    )}
                    {stages.length > 0 && (
                        <>
                            <div className="table-wrap hidden md:block">
                                <table className="table" aria-labelledby={TITLE_ID}>
                                    <thead>
                                        <tr>
                                            <th scope="col">Giai đoạn</th>
                                            <th scope="col">Nội dung</th>
                                            <th scope="col">Ngày dự kiến</th>
                                            <th scope="col">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stages.map((stage) => (
                                            <tr
                                                key={stage.id}
                                                aria-current={isCurrent(stage) ? "step" : undefined}
                                                className={cx(isCurrent(stage) && "bg-primary-softer font-semibold")}
                                            >
                                                <td>{stage.stageNumber}</td>
                                                <td className="cell-primary">{stage.stageName}</td>
                                                <td>{formatDate(stage.scheduledDate)}</td>
                                                <td>
                                                    <StageBadge status={stage.stageStatus} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <ul className="divide-y divide-border rounded-lg border border-border md:hidden">
                                {stages.map((stage) => (
                                    <li
                                        key={stage.id}
                                        aria-current={isCurrent(stage) ? "step" : undefined}
                                        className={cx("flex flex-col items-start gap-1 px-4 py-3", isCurrent(stage) && "bg-primary-softer font-semibold")}
                                    >
                                        <p className="num text-caption text-muted">
                                            {[`Giai đoạn ${stage.stageNumber}`, formatDate(stage.scheduledDate)].filter(Boolean).join(" · ")}
                                        </p>
                                        <p className="text-body-sm text-ink">{stage.stageName}</p>
                                        <StageBadge status={stage.stageStatus} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </>
            )}
        </DashboardSection>
    );
};

export default TreatmentProgressSection;
