import { Inbox } from "lucide-react";
import DashboardSection from "@/components/dashboard/DashboardSection";
import DetailLink from "@/components/ui/DetailLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE, INVOICE_PAYMENT_STATUS, TREATMENT_PLAN_STATUS } from "@/utils/messages";
import { getInvoiceDetailRoute, getTreatmentPlanDetailRoute } from "@/utils/routes";

const TITLE_ID = "patient-dashboard-tasks";

const joinParts = (parts) => parts.filter(Boolean).join(" · ");

const describeTask = (task) => {
    if (task.kind === "plan") {
        const sentBy = task.proposedAt ? [task.doctorName, "gửi", formatDate(task.proposedAt)].filter(Boolean).join(" ") : task.doctorName;
        return {
            title: `Kế hoạch ${task.planName} đang chờ bạn chấp nhận`,
            caption: joinParts([sentBy, `${task.stageCount} giai đoạn`, formatCurrency(task.estimatedTotalCost)]),
            status: task.status,
            statusLabels: TREATMENT_PLAN_STATUS,
            linkLabel: "Xem kế hoạch",
            linkContext: task.planName,
            to: getTreatmentPlanDetailRoute(task.id),
        };
    }

    return {
        title: `Hóa đơn ${task.invoiceNumber} chưa thanh toán`,
        caption: joinParts([
            formatCurrency(task.remainder),
            task.appointmentDate && `Lần khám ${formatDate(task.appointmentDate)}`,
            "Vui lòng thanh toán tại quầy",
        ]),
        status: task.status,
        statusLabels: INVOICE_PAYMENT_STATUS,
        linkLabel: "Xem hóa đơn",
        linkContext: task.invoiceNumber,
        to: getInvoiceDetailRoute(task.id),
    };
};

const TasksSection = ({ tasks = [], loading = false, failed = false }) => {
    const loaded = !loading && !failed;

    return (
        <DashboardSection
            id={TITLE_ID}
            title="Việc cần bạn xử lý"
            busy={loading}
            badge={loaded && tasks.length > 0 && <span className="badge badge-warning">{tasks.length} việc</span>}
            error={!loading && failed && GENERIC_ERROR_MESSAGE}
            empty={loaded && tasks.length === 0 && { icon: Inbox, text: "Bạn không có việc nào cần xử lý." }}
        >
            {loading && (
                <div aria-hidden="true" className="flex flex-col gap-4">
                    <div className="skeleton h-12" />
                    <div className="skeleton h-12" />
                </div>
            )}
            {!loading && tasks.length > 0 && (
                <ul className="divide-y divide-border">
                    {tasks.map((task) => {
                        const { title, caption, status, statusLabels, linkLabel, linkContext, to } = describeTask(task);
                        return (
                            <li key={`${task.kind}-${task.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0">
                                <div className="min-w-0 flex-1 basis-64">
                                    <p className="text-title text-ink">{title}</p>
                                    {caption && <p className="num mt-1 text-caption text-muted">{caption}</p>}
                                </div>
                                <StatusBadge status={status} labels={statusLabels} />
                                <DetailLink to={to} context={linkContext} chevron className="min-h-11 md:min-h-0">
                                    {linkLabel}
                                </DetailLink>
                            </li>
                        );
                    })}
                </ul>
            )}
        </DashboardSection>
    );
};

export default TasksSection;
