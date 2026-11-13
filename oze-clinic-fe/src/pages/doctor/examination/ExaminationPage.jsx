import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { toast } from "react-toastify";
import ConfirmExamDialog from "@/components/examination/ConfirmExamDialog";
import ExamPreStart from "@/components/examination/ExamPreStart";
import ExamStepper from "@/components/examination/ExamStepper";
import ExamTimer from "@/components/examination/ExamTimer";
import PatientCard from "@/components/examination/PatientCard";
import QueuePanel from "@/components/examination/QueuePanel";
import StepHeading from "@/components/examination/StepHeading";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import MyShiftBar from "@/components/staff/MyShiftBar";
import {
    callPatient,
    endExamination,
    getExamRecord,
    getExamWorkspace,
    markAbsent,
    saveMedicalHistory,
    setExamStep,
    startExamination,
} from "@/services/examinationService";
import useMediaQuery from "@/hooks/useMediaQuery";
import { cx } from "@/utils/cx";
import { EXAM_STEP_TITLES, EXAM_STEPS, GENERIC_ERROR_MESSAGE, QUEUE_STATUS } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";
import ClinicalExamTab from "./tab/ClinicalExamTab";
import PatientRecordTab from "./tab/PatientRecordTab";
import PrescriptionTab from "./tab/PrescriptionTab";
import TreatmentPlanTab from "./tab/TreatmentPlanTab";
import TreatmentTab from "./tab/TreatmentTab";

const STEP = { HISTORY: 0, EXAM: 1, PLAN: 2, TREATMENT: 3, PRESCRIPTION: 4 };

// Breadcrumb / "Tiếp theo" wording that differs from the step names (EXAM_STEPS).
const BREADCRUMB_LABEL = { [STEP.HISTORY]: "Thông tin bệnh nhân", [STEP.PLAN]: "Kế hoạch điều trị" };
const NEXT_LABEL = { [STEP.PLAN]: "Chuyển sang phòng điều trị", [STEP.PRESCRIPTION]: "Kết thúc lượt khám" };
const CALLED_STATUS = { label: "Đã gọi · chờ vào phòng", tone: "warning" };

// The tabs of a visit, in order (index = STEP, the stepper shows EXAM_STEPS for them). Each tab is a component in ./tab;
// render gets what the frame shares: the queue item, the record, busy, the record updaters (on*Change), goTo(step) and onEnd.
const EXAM_TABS = [
    {
        step: STEP.HISTORY,
        render: ({ item, record, busy, handlers, goTo, onEnd }) => (
            <PatientRecordTab
                queueId={item.id}
                record={record}
                busy={busy}
                onHistoryChange={handlers.onHistoryChange}
                onNext={async (history) => {
                    await saveMedicalHistory(item.id, history);
                    handlers.onHistoryChange(history);
                    goTo(STEP.EXAM);
                }}
                onEnd={(history) => {
                    handlers.onHistoryChange(history);
                    onEnd();
                }}
            />
        ),
    },
    {
        step: STEP.EXAM,
        render: ({ item, record, busy, handlers, goTo, onEnd }) => (
            <ClinicalExamTab queueId={item.id} record={record} busy={busy} onExamChange={handlers.onExamChange} onEnd={onEnd} onComplete={() => goTo(STEP.PLAN)} />
        ),
    },
    {
        step: STEP.PLAN,
        render: ({ item, record, busy, handlers, goTo, onEnd }) => (
            <TreatmentPlanTab queueId={item.id} record={record} busy={busy} onPlanChange={handlers.onPlanChange} onEnd={onEnd} onComplete={() => goTo(STEP.TREATMENT)} />
        ),
    },
    {
        step: STEP.TREATMENT,
        render: ({ item, record, busy, handlers, goTo, onEnd }) => (
            <TreatmentTab
                queueId={item.id}
                record={record}
                busy={busy}
                onTreatmentChange={handlers.onTreatmentChange}
                onPlanChange={handlers.onPlanChange}
                onEditPlan={() => goTo(STEP.PLAN)}
                onEnd={onEnd}
                onComplete={() => goTo(STEP.PRESCRIPTION)}
            />
        ),
    },
    {
        step: STEP.PRESCRIPTION,
        render: ({ item, record, busy, handlers, onEnd }) => (
            <PrescriptionTab queueId={item.id} record={record} busy={busy} onPrescriptionChange={handlers.onPrescriptionChange} onEnd={onEnd} />
        ),
    },
];

// Patient shown on the right: the one in the room, else the one called. Nobody until the doctor calls someone in;
// waiting patients cannot be opened.
const defaultSelection = (queue) =>
    (queue.find((item) => item.status === QUEUE_STATUS.IN_EXAMINATION) ?? queue.find((item) => item.status === QUEUE_STATUS.CALLED))?.id ?? null;

// Right side before anyone is called in: locked process, empty patient card, "Chưa có lượt khám".
const NoExamView = ({ waitingCount }) => (
    <>
        <ExamStepper locked />
        <PatientCard patient={null} />
        <div className="card-app flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
                <Stethoscope className="size-7" />
            </span>
            <h2 className="font-heading text-heading-2 text-ink">Chưa có lượt khám</h2>
            <p className="text-muted">
                {waitingCount > 0 ? `Có ${waitingCount} bệnh nhân đang chờ. Bấm “Gọi vào khám” ở một bệnh nhân để bắt đầu.` : "Hàng chờ đang trống."}
            </p>
        </div>
    </>
);

// Patient called in, exam not started: process still locked, patient card and what reception recorded.
const CalledView = ({ item, record }) => (
    <>
        <ExamStepper locked />
        <PatientCard patient={{ ...record.patient, queueNumber: item.queueNumber }} status={CALLED_STATUS} services={record.services} />
        <ExamPreStart intake={{ ...record.intake, allergies: record.history.allergies, conditions: record.history.conditions }} />
    </>
);

// Exam in progress: the frame (back link, breadcrumb, stepper, patient card with timer, step heading) around the tab
// being viewed (EXAM_TABS). handlers: { onHistoryChange, onExamChange, onPlanChange, onTreatmentChange, onPrescriptionChange }.
const InExamView = ({ item, record, busy, handlers, onStep, onEnd }) => {
    const current = item.step ?? STEP.HISTORY;
    const [viewing, setViewing] = useState(current);
    const shown = Math.min(viewing, current);

    const goTo = async (step) => {
        if (step > current && !(await onStep(step))) return;
        setViewing(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
            <div className="flex items-center gap-3">
                <Link to={ROUTES.DASHBOARD} className="btn btn-secondary btn-icon size-9" aria-label="Quay lại" title="Quay lại">
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </Link>
                <span className="h-5 w-px bg-border-strong" aria-hidden="true" />
                <Breadcrumb
                    items={[
                        { label: "Khám bệnh", href: ROUTES.DOCTOR_EXAMINATION },
                        { label: `Lượt khám ${record.encounterCode}` },
                        { label: BREADCRUMB_LABEL[shown] ?? EXAM_STEPS[shown] },
                    ]}
                />
            </div>
            <ExamStepper current={current} viewing={shown} onStepClick={goTo} />
            <PatientCard
                patient={{ ...record.patient, queueNumber: item.queueNumber, startedAt: item.startedAt }}
                status={{ label: "Đang khám", tone: "info" }}
                services={record.services}
                action={<ExamTimer startedAt={item.startedAt} />}
            />
            <StepHeading index={shown} total={EXAM_STEPS.length} title={EXAM_STEP_TITLES[shown]} nextLabel={NEXT_LABEL[shown] ?? EXAM_STEPS[shown + 1]} />

            {EXAM_TABS.find((tab) => tab.step === shown)?.render({ item, record, busy, handlers, goTo, onEnd })}
        </>
    );
};

const ExaminationPage = () => {
    const [workspace, setWorkspace] = useState(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [record, setRecord] = useState(null); // { id, data, failed }
    const isDesktop = useMediaQuery("(min-width: 64rem)");
    const [collapsedChoice, setCollapsedChoice] = useState(null); // null = automatic
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null); // { type: "absent" | "end", item }
    // Starting or ending the shift changes who the doctor may call: reload the queue then
    const [shiftVersion, setShiftVersion] = useState(0);

    useEffect(() => {
        getExamWorkspace().then((response) => {
            if (!response.success) {
                setLoadFailed(true);
                return;
            }
            setWorkspace(response.data);
            setSelectedId(defaultSelection(response.data.queue));
        });
    }, [shiftVersion]);

    useEffect(() => {
        if (selectedId == null) return undefined;
        let cancelled = false;
        getExamRecord(selectedId).then((response) => {
            if (!cancelled) setRecord({ id: selectedId, data: response.success ? response.data : null, failed: !response.success });
        });
        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    const queue = workspace?.queue ?? [];
    const selected = queue.find((item) => item.id === selectedId) ?? null;
    // Below lg the queue sits above the exam: fold it to a strip while a patient is called in or examined,
    // so the exam shows first. The doctor's own choice (the « / » button) wins.
    const collapsed = collapsedChoice ?? (!isDesktop && selected !== null);
    const recordReady = record?.id === selectedId && record.data;

    // Runs a queue action, then shows the new queue and moves the selection.
    const runAction = async (action, id, nextSelection) => {
        setBusy(true);
        const response = await action(id);
        setBusy(false);
        if (!response.success) {
            toast.error(response.message ?? GENERIC_ERROR_MESSAGE);
            return false;
        }
        if (response.message) toast.success(response.message);
        if (response.data?.queue) {
            setWorkspace(response.data);
            setSelectedId(nextSelection(response.data.queue));
        }
        return true;
    };

    const keep = () => selectedId;

    const confirmActions = {
        absent: markAbsent,
        end: endExamination,
    };

    const handleConfirm = async () => {
        const done = await runAction(confirmActions[confirm.type], confirm.item.id, defaultSelection);
        if (done) setConfirm(null);
    };

    // Keeps the page's copy of the record in sync with the drafts edited in the steps.
    const updateRecord = (key) => (value) => setRecord((current) => (current?.data ? { ...current, data: { ...current.data, [key]: value } } : current));
    const recordHandlers = {
        onHistoryChange: updateRecord("history"),
        onExamChange: updateRecord("exam"),
        onPlanChange: updateRecord("plan"),
        onTreatmentChange: updateRecord("treatment"),
        onPrescriptionChange: updateRecord("prescription"),
    };

    const renderMain = () => {
        if (loadFailed) return <p role="alert" className="alert alert-danger">{GENERIC_ERROR_MESSAGE}</p>;
        if (!workspace) return <div className="skeleton h-64 rounded-lg" aria-hidden="true" />;
        if (!selected) return <NoExamView waitingCount={queue.filter((item) => item.status === QUEUE_STATUS.WAITING).length} />;
        if (record?.id === selectedId && record.failed) return <p role="alert" className="alert alert-danger">Không tải được hồ sơ của bệnh nhân này.</p>;
        if (!recordReady) return <div className="skeleton h-64 rounded-lg" aria-hidden="true" />;
        if (selected.status === QUEUE_STATUS.IN_EXAMINATION) {
            return (
                <InExamView
                    key={selected.id}
                    item={selected}
                    record={record.data}
                    busy={busy}
                    handlers={recordHandlers}
                    onStep={(step) => runAction((id) => setExamStep(id, step), selected.id, keep)}
                    onEnd={() => setConfirm({ type: "end", item: selected })}
                />
            );
        }
        return <CalledView item={selected} record={record.data} />;
    };

    return (
        <>
        <MyShiftBar onChange={() => setShiftVersion((v) => v + 1)} />
        <div className={cx("grid grid-cols-1 items-start gap-5", collapsed ? "lg:grid-cols-[4rem_minmax(0,1fr)]" : "lg:grid-cols-[18.75rem_minmax(0,1fr)]")}>
            <div className="lg:sticky lg:top-4">
                {workspace ? (
                    <QueuePanel
                        shift={workspace.shift}
                        items={queue}
                        done={workspace.done}
                        selectedId={selectedId}
                        collapsed={collapsed}
                        onToggleCollapse={() => setCollapsedChoice(!collapsed)}
                        onSelect={setSelectedId}
                        onCall={(id) => runAction(callPatient, id, () => id)}
                        onMarkAbsent={(id) => setConfirm({ type: "absent", item: queue.find((item) => item.id === id) })}
                        onStart={(id) => runAction(startExamination, id, () => id)}                    />
                ) : (
                    !loadFailed && <div className="skeleton h-96 rounded-lg" aria-hidden="true" />
                )}
            </div>

            <section className="flex min-w-0 flex-col gap-5" aria-label="Khám bệnh">
                {renderMain()}
            </section>

            {confirm?.type === "absent" && (
                <ConfirmExamDialog
                    title="Báo vắng mặt"
                    description={`Số ${confirm.item.queueNumber} · ${confirm.item.patientName} sẽ bị đưa ra khỏi hàng chờ của ca này.`}
                    confirmLabel="Báo vắng mặt"
                    danger
                    busy={busy}
                    onConfirm={handleConfirm}
                    onClose={() => setConfirm(null)}
                />
            )}
            {confirm?.type === "end" && (
                // Reached the prescription (last step): ending completes the visit and finalizes the prescription.
                <ConfirmExamDialog
                    title={confirm.item.step >= STEP.PRESCRIPTION ? "Hoàn tất lượt khám" : "Kết thúc lượt khám"}
                    description={
                        confirm.item.step >= STEP.PRESCRIPTION
                            ? `Hoàn tất lượt khám của ${confirm.item.patientName}? Đơn thuốc sẽ được chốt và không sửa được nữa.`
                            : `Kết thúc lượt khám của ${confirm.item.patientName}? Các bước chưa làm sẽ không còn mở được trong lượt này.`
                    }
                    confirmLabel={confirm.item.step >= STEP.PRESCRIPTION ? "Hoàn tất" : "Kết thúc lượt khám"}
                    busy={busy}
                    onConfirm={handleConfirm}
                    onClose={() => setConfirm(null)}
                />
            )}
        </div>
        </>
    );
};

export default ExaminationPage;
