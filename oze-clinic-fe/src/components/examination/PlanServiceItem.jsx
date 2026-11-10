import { useId } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { sessionsCost } from "@/utils/examination";
import { formatNumber } from "@/utils/format";
import { PLAN_SERVICE_STATUS } from "@/utils/messages";
import PlanSessionForm from "./PlanSessionForm";

const MoveButton = ({ icon: Icon, label, disabled, onClick }) => (
    <button
        type="button"
        className="btn btn-secondary btn-icon size-8 shrink-0"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
    >
        <Icon className="size-4" aria-hidden="true" />
    </button>
);

// One registered service of the plan, in treatment order. Collapsed: name, status, "2 buổi · 800.000 ₫".
// Expanded: its sessions (PlanSessionForm) and "+ Thêm buổi điều trị".
// errors: { service?: message, sessions: { [sessionId]: {...} } } from validatePlan.
const PlanServiceItem = ({
    index,
    service,
    typeOptions,
    expanded = false,
    errors = {},
    canMoveUp,
    canMoveDown,
    onToggle,
    onMoveUp,
    onMoveDown,
    onAddSession,
    onChangeSession,
    onRemoveSession,
}) => {
    const panelId = useId();
    const ToggleIcon = expanded ? ChevronDown : ChevronRight;
    const hasErrors = Boolean(errors.service) || Object.keys(errors.sessions ?? {}).length > 0;

    return (
        <li className={cx("overflow-hidden rounded-[10px] border", expanded ? "border-primary" : hasErrors ? "border-danger" : "border-border")}>
            <div className={cx("flex items-center gap-3 px-4 py-3", expanded && "border-b border-primary/30 bg-primary-softer")}>
                <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-primary text-caption font-semibold text-on-primary">{index + 1}</span>
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    className="min-w-0 flex-1 cursor-pointer rounded text-left outline-none focus-visible:shadow-focus"
                    onClick={onToggle}
                >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-ink">{service.name}</span>
                        <StatusBadge status={service.status} labels={PLAN_SERVICE_STATUS} />
                    </span>
                    <span className="num block text-caption text-muted">
                        {service.sessions.length} buổi · {formatNumber(sessionsCost(service.sessions))} ₫
                        {hasErrors && !expanded && <span className="text-danger"> · Còn thông tin chưa nhập</span>}
                    </span>
                </button>
                <MoveButton icon={ArrowUp} label={`Đưa ${service.name} lên trước`} disabled={!canMoveUp} onClick={onMoveUp} />
                <MoveButton icon={ArrowDown} label={`Đưa ${service.name} xuống sau`} disabled={!canMoveDown} onClick={onMoveDown} />
                <button
                    type="button"
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted outline-none hover:bg-surface-tint focus-visible:shadow-focus"
                    aria-label={expanded ? `Thu gọn ${service.name}` : `Mở ${service.name}`}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={onToggle}
                >
                    <ToggleIcon className="size-5" aria-hidden="true" />
                </button>
            </div>

            {expanded && (
                <div id={panelId} className="flex flex-col gap-3 p-4">
                    {service.sessions.map((session, sessionIndex) => (
                        <PlanSessionForm
                            key={session.id}
                            index={sessionIndex}
                            session={session}
                            typeOptions={typeOptions}
                            errors={errors.sessions?.[session.id]}
                            onChange={(changes) => onChangeSession(session.id, changes)}
                            onRemove={() => onRemoveSession(session.id)}
                        />
                    ))}
                    {errors.service && <p className="error-text">{errors.service}</p>}
                    <button
                        type="button"
                        className="flex h-11 cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-primary text-body-sm font-medium text-primary outline-none hover:bg-primary-softer focus-visible:shadow-focus"
                        onClick={onAddSession}
                    >
                        + Thêm buổi điều trị
                    </button>
                </div>
            )}
        </li>
    );
};

export default PlanServiceItem;
