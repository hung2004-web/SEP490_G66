import { newPlanSession } from "@/utils/examination";
import ClinicalExamSection from "./ClinicalExamSection";
import PlanServiceItem from "./PlanServiceItem";

// "Kế hoạch theo dịch vụ đăng ký": the registered services in treatment order, each with its sessions.
// services: see utils/examination; typeOptionsOf(service) -> [{ id, name, price }];
// expandedId: the service shown open; errors: result of validatePlan (shown after a submit attempt).
// onChange receives the whole updated services list (reordered, sessions added / edited / removed).
const PlanServiceList = ({ services = [], typeOptionsOf, expandedId, errors, onToggle, onChange }) => {
    const move = (index, offset) => {
        const next = [...services];
        [next[index], next[index + offset]] = [next[index + offset], next[index]];
        onChange(next);
    };

    const updateSessions = (serviceId, update) =>
        onChange(services.map((service) => (service.id === serviceId ? { ...service, sessions: update(service.sessions) } : service)));

    return (
        <ClinicalExamSection
            title="Kế hoạch theo dịch vụ đăng ký"
            badge={<span className="num rounded-full bg-primary-soft px-2 py-0.5 text-caption font-medium text-primary">{services.length} dịch vụ</span>}
            bodyClassName="flex flex-col gap-3"
        >
            {services.length === 0 ? (
                <p className="py-2 text-center text-muted">Bệnh nhân không đăng ký dịch vụ điều trị nào ngoài khám tổng quát.</p>
            ) : (
                <ol className="flex flex-col gap-3">
                    {services.map((service, index) => (
                        <PlanServiceItem
                            key={service.id}
                            index={index}
                            service={service}
                            typeOptions={typeOptionsOf(service)}
                            expanded={service.id === expandedId}
                            errors={{
                                service: errors?.services?.[service.id],
                                sessions: Object.fromEntries(service.sessions.filter((session) => errors?.sessions?.[session.id]).map((session) => [session.id, errors.sessions[session.id]])),
                            }}
                            canMoveUp={index > 0}
                            canMoveDown={index < services.length - 1}
                            onToggle={() => onToggle(service.id === expandedId ? null : service.id)}
                            onMoveUp={() => move(index, -1)}
                            onMoveDown={() => move(index, 1)}
                            onAddSession={() => updateSessions(service.id, (sessions) => [...sessions, newPlanSession(`session-${Date.now()}`)])}
                            onChangeSession={(sessionId, changes) =>
                                updateSessions(service.id, (sessions) => sessions.map((session) => (session.id === sessionId ? { ...session, ...changes } : session)))
                            }
                            onRemoveSession={(sessionId) => updateSessions(service.id, (sessions) => sessions.filter((session) => session.id !== sessionId))}
                        />
                    ))}
                </ol>
            )}
            <p className="text-caption text-muted">Dịch vụ lấy từ phiếu đăng ký của bệnh nhân</p>
        </ClinicalExamSection>
    );
};

export default PlanServiceList;
