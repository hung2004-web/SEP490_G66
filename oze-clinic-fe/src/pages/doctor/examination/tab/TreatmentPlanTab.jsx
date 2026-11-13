import { useState } from "react";
import { toast } from "react-toastify";
import useAutosave from "@/hooks/useAutosave";
import { saveTreatmentPlan } from "@/services/examinationService";
import { MOCK_PLAN_SERVICE_TYPES } from "@/utils/data/mockExamination";
import { validatePlan } from "@/utils/examination";
import PlanServiceList from "@/components/examination/PlanServiceList";
import PlanSummaryCard from "@/components/examination/PlanSummaryCard";
import StepActionBar from "@/components/examination/StepActionBar";

// TODO(api): service types should come from the service catalogue endpoint.
const typeOptionsOf = (service) => MOCK_PLAN_SERVICE_TYPES[service.serviceId] ?? [];

const NO_SERVICE_HINT = "Bệnh nhân chỉ đăng ký khám tổng quát, không có dịch vụ cần lập kế hoạch.";

// Step 3 "Lập kế hoạch điều trị": sessions of each registered service, in treatment order, with the summary.
// record.plan is the saved draft ({ services }); every change is saved automatically and passed to onPlanChange.
// The plan is checked (validatePlan) before onComplete (go to the treatment room); errors stay visible and update
// while the doctor fixes them.
const TreatmentPlanTab = ({ queueId, record, busy = false, onPlanChange, onComplete, onEnd }) => {
    const { value: plan, setValue: setPlan, statusText, saveNow } = useAutosave((draft) => saveTreatmentPlan(queueId, draft), record.plan, onPlanChange);
    // Services shown open; each one opens and closes independently of the others.
    const [expandedIds, setExpandedIds] = useState(() => (record.plan.services[0] ? [record.plan.services[0].id] : []));
    const toggleService = (id) => setExpandedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    const [errors, setErrors] = useState(null);
    const hasServices = plan.services.length > 0;

    const changeServices = (services) => {
        setPlan({ ...plan, services });
        if (errors) setErrors(validatePlan(services));
    };

    // Shows the errors and opens the first service that has one (others stay as they are); true when the plan can be sent.
    const checkPlan = () => {
        const result = validatePlan(plan.services);
        setErrors(result);
        if (!result.count) return true;
        const firstWithError = plan.services.find((service) => result.services[service.id] || service.sessions.some((session) => result.sessions[session.id]));
        if (firstWithError) setExpandedIds((current) => (current.includes(firstWithError.id) ? current : [...current, firstWithError.id]));
        toast.error("Kế hoạch còn thông tin chưa nhập.");
        return false;
    };

    const submit = async (action) => {
        if (!checkPlan()) return;
        const response = await saveNow();
        if (!response.success) {
            toast.error("Chưa lưu được kế hoạch, thử lại sau.");
            return;
        }
        action?.(plan);
    };

    const status = !hasServices ? NO_SERVICE_HINT : errors?.count ? `${statusText} · Còn ${errors.count} thông tin chưa nhập` : statusText;

    return (
        <>
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
                <PlanServiceList
                    services={plan.services}
                    typeOptionsOf={typeOptionsOf}
                    expandedIds={expandedIds}
                    errors={errors}
                    onToggle={toggleService}
                    onChange={changeServices}
                />
                <div className="lg:sticky lg:top-4">
                    <PlanSummaryCard services={plan.services} />
                </div>
            </div>
            <StepActionBar status={status}>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onEnd?.(plan)}>
                    Kết thúc lượt khám
                </button>
                <button
                    type="button"
                    className="btn btn-primary h-auto min-h-control py-2 text-center whitespace-normal"
                    disabled={busy || !hasServices}
                    onClick={() => submit(onComplete)}
                >
                    Hoàn thành · chuyển sang phòng điều trị
                </button>
            </StepActionBar>
        </>
    );
};

export default TreatmentPlanTab;
