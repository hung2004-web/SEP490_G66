import { useState } from "react";
import { toast } from "react-toastify";
import useAutosave from "@/hooks/useAutosave";
import { completeTreatmentSession, saveTreatmentDraft } from "@/services/examinationService";
import { currentTreatmentSessionId, initialTreatmentItems, planSessionList, upcomingPlanSessions } from "@/utils/examination";
import { getClinicToday } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE } from "@/utils/messages";
import FollowUpCard from "./FollowUpCard";
import SessionInvoiceCard from "./SessionInvoiceCard";
import StepActionBar from "./StepActionBar";
import TreatmentItemDeleteDialog from "./TreatmentItemDeleteDialog";
import TreatmentItemDialog from "./TreatmentItemDialog";
import TreatmentItemTable from "./TreatmentItemTable";
import TreatmentNoteCard from "./TreatmentNoteCard";
import TreatmentSessionCard from "./TreatmentSessionCard";

// Draft to start from: today's session picked, a new draft pre-filled with that session.
const initialDraftOf = ({ plan, treatment }) => {
    const sessionId = currentTreatmentSessionId(plan, treatment);
    const session = planSessionList(plan.services).find((item) => item.id === sessionId);
    const isNew = !treatment.sessionId && !treatment.items.length;
    return { ...treatment, sessionId, items: isNew ? initialTreatmentItems(session) : treatment.items };
};

// Step 4 "Thực hiện điều trị": today's session of the plan, what was done and its price, a note and the session invoice.
// When today's session is the last one of the plan, the doctor can also propose a check-up date ("Hẹn tái khám").
// record.treatment is the saved draft; changes are saved automatically and passed to onTreatmentChange.
// "Chuyển sang Đơn thuốc" marks the session done (onPlanChange gets the new plan) then onComplete.
const TreatmentStep = ({ queueId, record, busy = false, onTreatmentChange, onPlanChange, onEditPlan, onComplete, onEnd }) => {
    const [initialDraft] = useState(() => initialDraftOf(record));
    const { value: draft, setValue: setDraft, statusText, saveNow } = useAutosave((value) => saveTreatmentDraft(queueId, value), initialDraft, onTreatmentChange);
    const [dialog, setDialog] = useState(null); // { type: "add" | "edit" | "delete", item? }
    const [working, setWorking] = useState(false); // while "Chuyển sang Đơn thuốc" runs

    const setItems = (items) => setDraft({ ...draft, items });

    const saveItem = (item) => {
        if (dialog.type === "add") {
            setItems([...draft.items, { ...item, id: `item-${Date.now()}`, createdAt: new Date().toISOString() }]);
            toast.success("Đã thêm nội dung điều trị.");
        } else {
            setItems(draft.items.map((entry) => (entry.id === item.id ? item : entry)));
            toast.success("Đã lưu thay đổi.");
        }
        setDialog(null);
    };

    const removeItem = () => {
        setItems(draft.items.filter((entry) => entry.id !== dialog.item.id));
        toast.success("Đã xoá nội dung điều trị.");
        setDialog(null);
    };

    const goToPrescription = async () => {
        if (!draft.items.length) {
            toast.error("Thêm ít nhất một nội dung điều trị.");
            return;
        }
        setWorking(true);
        const response = await completeTreatmentSession(queueId, draft);
        setWorking(false);
        if (!response.success) {
            toast.error(response.message ?? GENERIC_ERROR_MESSAGE);
            return;
        }
        onPlanChange(response.data);
        onComplete();
    };

    const endVisit = async () => {
        await saveNow();
        onEnd();
    };

    if (!draft.sessionId) {
        return (
            <div className="card-app flex flex-col items-center gap-3 py-14 text-center">
                <p className="font-semibold text-ink">Không còn buổi điều trị nào trong kế hoạch</p>
                <p className="text-muted">Thêm buổi điều trị ở bước Lập kế hoạch điều trị để thực hiện.</p>
                <button type="button" className="btn btn-secondary" onClick={onEditPlan}>
                    Quay lại Lập kế hoạch điều trị
                </button>
            </div>
        );
    }

    const disabled = busy || working;
    const isLastSession = upcomingPlanSessions(record.plan.services, draft.sessionId).length === 0;

    return (
        <>
            <TreatmentSessionCard plan={record.plan} currentSessionId={draft.sessionId} onEditPlan={onEditPlan} />
            <TreatmentItemTable
                items={draft.items}
                onAdd={() => setDialog({ type: "add" })}
                onEdit={(item) => setDialog({ type: "edit", item })}
                onRemove={(item) => setDialog({ type: "delete", item })}
            />
            <TreatmentNoteCard value={draft.note} onChange={(note) => setDraft({ ...draft, note })} />
            <SessionInvoiceCard items={draft.items} />
            {isLastSession && <FollowUpCard value={draft.followUpDate} today={getClinicToday()} onChange={(followUpDate) => setDraft({ ...draft, followUpDate })} />}
            <StepActionBar status={statusText}>
                <button type="button" className="btn btn-secondary" disabled={disabled} onClick={saveNow}>
                    Lưu nháp
                </button>
                <button type="button" className="btn btn-secondary" disabled={disabled} onClick={endVisit}>
                    Kết thúc lượt khám
                </button>
                <button type="button" className="btn btn-primary" disabled={disabled} onClick={goToPrescription}>
                    {working && <span className="btn-spinner" aria-hidden="true" />}
                    Chuyển sang Đơn thuốc
                </button>
            </StepActionBar>

            {(dialog?.type === "add" || dialog?.type === "edit") && (
                <TreatmentItemDialog
                    item={dialog.item ?? null}
                    patientName={record.patient.name}
                    subtitle={`${record.patient.name} · Lượt khám ${record.encounterCode}`}
                    onSave={saveItem}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.type === "delete" && <TreatmentItemDeleteDialog item={dialog.item} onConfirm={removeItem} onClose={() => setDialog(null)} />}
        </>
    );
};

export default TreatmentStep;
