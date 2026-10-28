import { useState } from "react";
import { CalendarDays, ReceiptText, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import RecentVisitsSection from "@/components/dashboard/RecentVisitsSection";
import StatCard from "@/components/dashboard/StatCard";
import TasksSection from "@/components/dashboard/TasksSection";
import TreatmentProgressSection from "@/components/dashboard/TreatmentProgressSection";
import UpcomingAppointmentsSection from "@/components/dashboard/UpcomingAppointmentsSection";
import useAsync from "@/hooks/useAsync";
import useSession from "@/hooks/useSession";
import { getMyAppointments, getMyInvoices, getMyTreatmentPlans } from "@/services/patientDashboardService";
import { formatCurrency, formatDate, formatTime, formatWeekday, toDateOnly } from "@/utils/format";
import { APPOINTMENT_STATUS, EXAMINATION_STATUS, PAYMENT_STATUS, PLAN_STATUS, STAGE_STATUS } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const EMPTY_VALUE = "—";
const NEXT_APPOINTMENTS_LIMIT = 3;
const RECENT_VISITS_LIMIT = 3;
const UPCOMING_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED];
const TODAY_STATUS_RANK = {
    [APPOINTMENT_STATUS.IN_SERVICE]: 0,
    [APPOINTMENT_STATUS.CHECKED_IN]: 1,
    [APPOINTMENT_STATUS.CONFIRMED]: 2,
    [APPOINTMENT_STATUS.PENDING]: 2,
};
const RECENT_EXAMINATION_STATUSES = [EXAMINATION_STATUS.COMPLETED, EXAMINATION_STATUS.LOCKED];
const UNPAID_STATUSES = [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIALLY_PAID];

const toResource = ({ loading, error, value }) => {
    const failed = !loading && (Boolean(error) || value?.success === false || !Array.isArray(value?.data));
    return { loading, failed, data: !loading && !failed ? value.data : [] };
};

const dateOf = (appointment) => (appointment.appointmentDate ?? "").slice(0, 10);

const compareTime = (a, b) => (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? "");

const compareDateTime = (a, b) => dateOf(a).localeCompare(dateOf(b)) || compareTime(a, b);

const getUpcoming = (appointments, today) =>
    appointments.filter((item) => UPCOMING_STATUSES.includes(item.status) && dateOf(item) >= today).sort(compareDateTime);

const getHighlighted = (appointments, today, upcoming) => {
    const [first] = appointments
        .filter((item) => dateOf(item) === today && Object.hasOwn(TODAY_STATUS_RANK, item.status))
        .sort((a, b) => TODAY_STATUS_RANK[a.status] - TODAY_STATUS_RANK[b.status] || compareTime(a, b));
    return first ?? upcoming.find((item) => dateOf(item) > today) ?? null;
};

const getNextAppointments = (upcoming, highlighted) =>
    upcoming.filter((item) => item.id !== highlighted?.id).slice(0, NEXT_APPOINTMENTS_LIMIT);

const getStatOneCaption = (upcoming, highlighted) => {
    const [nearest] = upcoming;
    if (nearest) return `Gần nhất: ${[formatDate(nearest.appointmentDate), formatTime(nearest.timeSlotStart)].filter(Boolean).join(" · ")}`;
    return highlighted ? "Không có lịch hẹn nào sau hôm nay" : "Chưa có lịch hẹn";
};

const getRecentVisits = (appointments) =>
    appointments
        .filter((item) => item.status === APPOINTMENT_STATUS.COMPLETED && RECENT_EXAMINATION_STATUSES.includes(item.examinationStatus))
        .sort((a, b) => compareDateTime(b, a))
        .slice(0, RECENT_VISITS_LIMIT);

const getActivePlan = (plans) =>
    plans
        .filter((plan) => plan.status === PLAN_STATUS.IN_PROGRESS)
        .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "") || b.treatmentPlanId - a.treatmentPlanId)[0] ?? null;

const sortStages = (stages) => [...(stages ?? [])].sort((a, b) => a.stageNumber - b.stageNumber);

const getStageProgress = (stages) => {
    const sorted = sortStages(stages);
    const active = sorted.filter((stage) => stage.stageStatus !== STAGE_STATUS.CANCELLED);
    const completed = active.filter((stage) => stage.stageStatus === STAGE_STATUS.COMPLETED).length;
    const currentIndex = active.findIndex((stage) => stage.stageStatus !== STAGE_STATUS.COMPLETED);
    const y = active.length;
    return {
        y,
        completed,
        x: currentIndex === -1 ? y : currentIndex + 1,
        currentStageId: currentIndex === -1 ? null : active[currentIndex].id,
        percent: y ? Math.round((completed / y) * 10000) / 100 : 0,
        stages: sorted,
    };
};

const getRemainder = (invoice) => Math.max(0, (invoice.finalAmount ?? 0) - (invoice.paidAmount ?? 0));

const getUnpaidInvoices = (invoices) =>
    invoices
        .filter((invoice) => UNPAID_STATUSES.includes(invoice.paymentStatus) && getRemainder(invoice) > 0)
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id - b.id);

const getTasks = (plans, unpaidInvoices) => [
    ...plans
        .filter((plan) => plan.status === PLAN_STATUS.PROPOSED)
        .sort((a, b) => (b.proposedAt ?? "").localeCompare(a.proposedAt ?? "") || b.treatmentPlanId - a.treatmentPlanId)
        .map((plan) => ({
            kind: "plan",
            id: plan.treatmentPlanId,
            status: plan.status,
            planName: plan.planName,
            doctorName: plan.doctorName,
            proposedAt: plan.proposedAt,
            stageCount: getStageProgress(plan.stages).y,
            estimatedTotalCost: plan.estimatedTotalCost,
        })),
    ...unpaidInvoices.map((invoice) => ({
        kind: "invoice",
        id: invoice.id,
        status: invoice.paymentStatus,
        invoiceNumber: invoice.invoiceNumber,
        remainder: getRemainder(invoice),
        appointmentDate: invoice.appointmentDate,
    })),
];

const getGreeting = (userName, today) => {
    const name = userName?.trim();
    return `Xin chào${name ? `, ${name}` : ""} · ${formatWeekday(today)}, ${formatDate(today)}`;
};

const getPlanStat = (activePlan, progress) => {
    if (!activePlan) return { value: EMPTY_VALUE, caption: "Chưa có kế hoạch đang điều trị" };
    if (progress.y === 0) return { value: EMPTY_VALUE, caption: activePlan.planName };
    return { value: `Giai đoạn ${progress.x}/${progress.y}`, caption: activePlan.planName };
};

const PatientDashboard = () => {
    const { userName } = useSession();
    const [today] = useState(() => toDateOnly(new Date()));
    const appointments = toResource(useAsync(getMyAppointments, []));
    const plans = toResource(useAsync(getMyTreatmentPlans, []));
    const invoices = toResource(useAsync(getMyInvoices, []));

    const upcoming = getUpcoming(appointments.data, today);
    const highlighted = getHighlighted(appointments.data, today, upcoming);
    const activePlan = getActivePlan(plans.data);
    const progress = getStageProgress(activePlan?.stages);
    const unpaidInvoices = getUnpaidInvoices(invoices.data);
    const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + getRemainder(invoice), 0);
    const planStat = plans.failed ? { value: EMPTY_VALUE } : getPlanStat(activePlan, progress);

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tổng quan</h1>
                    <p className="page-description">{getGreeting(userName, today)}</p>
                </div>
                <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-primary min-h-11 md:min-h-0">
                    Đặt lịch hẹn
                </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <StatCard
                    icon={CalendarDays}
                    label="Lịch hẹn sắp tới"
                    value={appointments.failed ? EMPTY_VALUE : upcoming.length}
                    caption={appointments.failed ? null : getStatOneCaption(upcoming, highlighted)}
                    to={ROUTES.APPOINTMENTS}
                    loading={appointments.loading}
                />
                <StatCard
                    icon={Stethoscope}
                    label="Kế hoạch đang điều trị"
                    value={planStat.value}
                    caption={planStat.caption}
                    to={ROUTES.TREATMENT_PLANS}
                    loading={plans.loading}
                />
                <StatCard
                    icon={ReceiptText}
                    label="Hóa đơn chưa thanh toán"
                    value={invoices.failed ? EMPTY_VALUE : formatCurrency(unpaidTotal)}
                    caption={
                        invoices.failed
                            ? null
                            : unpaidInvoices.length > 0
                              ? `${unpaidInvoices.length} hóa đơn · thanh toán tại quầy`
                              : "Không có hóa đơn chưa thanh toán"
                    }
                    to={ROUTES.INVOICES}
                    loading={invoices.loading}
                />
            </div>
            <div className="mt-6 flex flex-col gap-6">
                <TasksSection
                    tasks={getTasks(plans.data, unpaidInvoices)}
                    loading={plans.loading || invoices.loading}
                    failed={plans.failed || invoices.failed}
                />
                <UpcomingAppointmentsSection
                    highlighted={highlighted}
                    highlightedIsToday={highlighted ? dateOf(highlighted) === today : false}
                    nextAppointments={getNextAppointments(upcoming, highlighted)}
                    loading={appointments.loading}
                    failed={appointments.failed}
                />
                <TreatmentProgressSection
                    plan={activePlan && { ...activePlan, stages: progress.stages }}
                    progress={activePlan && progress}
                    loading={plans.loading}
                    failed={plans.failed}
                />
                <RecentVisitsSection visits={getRecentVisits(appointments.data)} loading={appointments.loading} failed={appointments.failed} />
            </div>
        </>
    );
};

export default PatientDashboard;
