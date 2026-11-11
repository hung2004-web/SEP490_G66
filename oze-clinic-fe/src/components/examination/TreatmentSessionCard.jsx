import { Check } from "lucide-react";
import { cx } from "@/utils/cx";
import { planProgress, planSessionList } from "@/utils/examination";
import { formatDate } from "@/utils/format";
import ClinicalExamSection from "./ClinicalExamSection";

const PlanFact = ({ label, value }) => (
    <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-caption text-muted">{label}</dt>
        <dd className="num truncate font-semibold text-ink">{value}</dd>
    </div>
);

// Right end of a session row: today's chip, "Đã thực hiện", or the planned date.
const SessionWhen = ({ session, current }) => {
    if (current) return <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-caption font-medium text-on-primary">Hôm nay · đang thực hiện</span>;
    if (session.status === "done") return <span className="shrink-0 text-caption font-medium text-success">Đã thực hiện</span>;
    return <span className="num shrink-0 text-caption text-muted">{session.date ? formatDate(session.date) : "Chưa có ngày"}</span>;
};

const SessionDot = ({ session, current }) => {
    if (session.status === "done")
        return (
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success text-on-primary" aria-hidden="true">
                <Check className="size-3" strokeWidth={3} />
            </span>
        );
    return (
        <span className="grid size-4 shrink-0 place-items-center" aria-hidden="true">
            <span className={cx("size-2.5 rounded-full", current ? "bg-primary" : "bg-border-strong")} />
        </span>
    );
};

// "Buổi hôm nay · Lấy cao răng": the plan (code, doctor, progress) and every session of it, today's highlighted.
// plan: { code, doctorName, services } (services as in step 3). currentSessionId: the session done in this visit.
// onEditPlan: "Xem / sửa kế hoạch" (back to step 3); the link is hidden without it.
const TreatmentSessionCard = ({ plan, currentSessionId, onEditPlan }) => {
    const sessions = planSessionList(plan.services);
    const current = sessions.find((session) => session.id === currentSessionId);
    const progress = planProgress(plan.services);

    return (
        <ClinicalExamSection
            title={current ? `Buổi hôm nay · ${current.serviceName}` : "Buổi hôm nay"}
            divided={false}
            action={
                onEditPlan && (
                    <button type="button" className="cursor-pointer rounded text-body-sm font-medium text-primary outline-none hover:underline focus-visible:shadow-focus" onClick={onEditPlan}>
                        Xem / sửa kế hoạch
                    </button>
                )
            }
            bodyClassName="flex flex-col gap-3"
        >
            <dl className="flex flex-wrap gap-x-6 gap-y-2 rounded-[10px] bg-surface-tint px-3.5 py-2.5 text-body-sm">
                <PlanFact label="Kế hoạch" value={plan.code} />
                <PlanFact label="Bác sĩ lập" value={plan.doctorName} />
                <PlanFact label="Tiến độ" value={`${progress.done}/${progress.total} buổi`} />
            </dl>

            {sessions.length === 0 ? (
                <p className="py-2 text-center text-muted">Kế hoạch chưa có buổi điều trị nào.</p>
            ) : (
                <ol className="overflow-hidden rounded-[10px] border border-border text-body-sm" aria-label="Các buổi trong kế hoạch">
                    {sessions.map((session) => {
                        const isCurrent = session.id === currentSessionId;
                        return (
                            <li
                                key={session.id}
                                aria-current={isCurrent ? "step" : undefined}
                                className={cx(
                                    "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3.5 py-2.5 first:border-t-0",
                                    isCurrent ? "bg-primary-soft" : "bg-canvas"
                                )}
                            >
                                <SessionDot session={session} current={isCurrent} />
                                <span className="min-w-0 font-medium text-ink sm:w-36 sm:shrink-0">
                                    {session.serviceIndex}. {session.serviceName}
                                </span>
                                <span className="num shrink-0 rounded-full bg-surface-tint px-2 py-0.5 text-caption font-medium text-body">Buổi {session.number}</span>
                                <span className="min-w-0 basis-full text-body sm:basis-0 sm:flex-1">{session.title}</span>
                                <span className="ml-auto sm:ml-0">
                                    <SessionWhen session={session} current={isCurrent} />
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </ClinicalExamSection>
    );
};

export default TreatmentSessionCard;
