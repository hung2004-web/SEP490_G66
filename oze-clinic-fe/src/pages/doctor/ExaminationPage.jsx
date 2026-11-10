import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { toast } from "react-toastify";
import ClinicalExamStep from "@/components/examination/ClinicalExamStep";
import ConfirmExamDialog from "@/components/examination/ConfirmExamDialog";
import ExamPreStart from "@/components/examination/ExamPreStart";
import ExamStepper from "@/components/examination/ExamStepper";
import ExamTimer from "@/components/examination/ExamTimer";
import MedicalHistoryStep from "@/components/examination/MedicalHistoryStep";
import PatientCard from "@/components/examination/PatientCard";
import QueuePanel from "@/components/examination/QueuePanel";
import StepHeading from "@/components/examination/StepHeading";
import TreatmentPlanStep from "@/components/examination/TreatmentPlanStep";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import {
    callPatient,
    endExamination,
    getExamRecord,
    getExamWorkspace,
    markAbsent,
    saveMedicalHistory,
    sendPlanToReception,
    setExamStep,
    startExamination,
} from "@/services/examinationService";
import useMediaQuery from "@/hooks/useMediaQuery";
import { cx } from "@/utils/cx";
import { EXAM_STEP_TITLES, EXAM_STEPS, GENERIC_ERROR_MESSAGE, QUEUE_STATUS } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const STEP = { HISTORY: 0, EXAM: 1, PLAN: 2 };

// Breadcrumb / "Tiếp theo" wording that differs from the step names (EXAM_STEPS).
const BREADCRUMB_LABEL = { [STEP.HISTORY]: "Thông tin bệnh nhân", [STEP.PLAN]: "Kế hoạch điều trị" };
const NEXT_LABEL = { [STEP.PLAN]: "Chuyển sang phòng điều trị" };
const CALLED_STATUS = { label: "Đã gọi · chờ vào phòng", tone: "warning" };

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

// Steps 4–5 (treatment room) are built in their own tasks.
const PendingStep = ({ title, onBack }) => (
    <div className="card-app flex flex-col items-center gap-3 py-14 text-center">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-muted">Bước này đang được xây dựng.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
            Quay lại bước Lập kế hoạch điều trị
        </button>
    </div>
);

// Patient called in, exam not started: process still locked, patient card and what reception recorded.
const CalledView = ({ item, record }) => (
    <>
        <ExamStepper locked />
        <PatientCard patient={{ ...record.patient, queueNumber: item.queueNumber }} status={CALLED_STATUS} services={record.services} />
        <ExamPreStart intake={{ ...record.intake, allergies: record.history.allergies, conditions: record.history.conditions }} />
    </>
);

// Exam in progress: process stepper, patient card with timer, then the content of the step being viewed.
const InExamView = ({ item, record, busy, onHistoryChange, onExamChange, onPlanChange, onStep, onSendToReception, onEnd }) => {
    const current = item.step ?? STEP.HISTORY;
    const [viewing, setViewing] = useState(current);
    const shown = Math.min(viewing, current);

    const goTo = async (step) => {
        if (step > current && !(await onStep(step))) return;
        setViewing(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleNextFromHistory = async (history) => {
        await saveMedicalHistory(item.id, history);
        onHistoryChange(history);
        goTo(STEP.EXAM);
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

            {shown === STEP.HISTORY && (
                <MedicalHistoryStep
                    queueId={item.id}
                    record={record}
                    busy={busy}
                    onHistoryChange={onHistoryChange}
                    onNext={handleNextFromHistory}
                    onEnd={(history) => {
                        onHistoryChange(history);
                        onEnd();
                    }}
                />
            )}
            {shown === STEP.EXAM && (
                <ClinicalExamStep
                    queueId={item.id}
                    record={record}
                    busy={busy}
                    onExamChange={onExamChange}
                    onEnd={onEnd}
                    onComplete={() => goTo(STEP.PLAN)}
                />
            )}
            {shown === STEP.PLAN && (
                <TreatmentPlanStep
                    queueId={item.id}
                    record={record}
                    busy={busy}
                    onPlanChange={onPlanChange}
                    onEnd={onEnd}
                    onSendToReception={onSendToReception}
                    onComplete={() => goTo(STEP.PLAN + 1)}
                />
            )}
            {shown > STEP.PLAN && <PendingStep title={EXAM_STEP_TITLES[shown]} onBack={() => goTo(STEP.PLAN)} />}
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

    useEffect(() => {
        getExamWorkspace().then((response) => {
            if (!response.success) {
                setLoadFailed(true);
                return;
            }
            setWorkspace(response.data);
            setSelectedId(defaultSelection(response.data.queue));
        });
    }, []);

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
        send: (id) => sendPlanToReception(id, confirm.plan),
    };

    const handleConfirm = async () => {
        const done = await runAction(confirmActions[confirm.type], confirm.item.id, defaultSelection);
        if (done) setConfirm(null);
    };

    // Keeps the page's copy of the record in sync with the drafts edited in the steps.
    const updateRecord = (key) => (value) => setRecord((current) => (current?.data ? { ...current, data: { ...current.data, [key]: value } } : current));
    const updateHistory = updateRecord("history");
    const updateExam = updateRecord("exam");
    const updatePlan = updateRecord("plan");

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
                    onHistoryChange={updateHistory}
                    onExamChange={updateExam}
                    onPlanChange={updatePlan}
                    onStep={(step) => runAction((id) => setExamStep(id, step), selected.id, keep)}
                    onSendToReception={(plan) => setConfirm({ type: "send", item: selected, plan })}
                    onEnd={() => setConfirm({ type: "end", item: selected })}
                />
            );
        }
        return <CalledView item={selected} record={record.data} />;
    };

    return (
        <div className={cx("grid grid-cols-1 items-start gap-5", collapsed ? "lg:grid-cols-[4rem_minmax(0,1fr)]" : "lg:grid-cols-[18.75rem_minmax(0,1fr)]")}>
            <div className="lg:sticky lg:top-4">
                {workspace ? (
                    <QueuePanel
                        shift={workspace.shift}
                        items={queue}
                        doneCount={workspace.doneCount}
                        selectedId={selectedId}
                        collapsed={collapsed}
                        onToggleCollapse={() => setCollapsedChoice(!collapsed)}
                        onSelect={setSelectedId}
                        onCall={(id) => runAction(callPatient, id, () => id)}
                        onMarkAbsent={(id) => setConfirm({ type: "absent", item: queue.find((item) => item.id === id) })}
                        onStart={(id) => runAction(startExamination, id, () => id)}
                        onOpenDone={() => toast.info("Danh sách đã khám trong ca đang được xây dựng.")}
                    />
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
            {confirm?.type === "send" && (
                <ConfirmExamDialog
                    title="Gửi lễ tân đặt lịch hẹn"
                    description={`Kết thúc lượt khám của ${confirm.item.patientName} và gửi kế hoạch điều trị cho lễ tân đặt lịch các buổi tiếp theo?`}
                    confirmLabel="Gửi lễ tân"
                    busy={busy}
                    onConfirm={handleConfirm}
                    onClose={() => setConfirm(null)}
                />
            )}
            {confirm?.type === "end" && (
                <ConfirmExamDialog
                    title="Kết thúc lượt khám"
                    description={`Kết thúc lượt khám của ${confirm.item.patientName}? Các bước chưa làm sẽ không còn mở được trong lượt này.`}
                    confirmLabel="Kết thúc lượt khám"
                    busy={busy}
                    onConfirm={handleConfirm}
                    onClose={() => setConfirm(null)}
                />
            )}
        </div>
    );
};

export default ExaminationPage;
