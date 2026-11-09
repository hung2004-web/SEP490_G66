import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { toast } from "react-toastify";
import ClinicalExamStep from "@/components/examination/ClinicalExamStep";
import ConfirmExamDialog from "@/components/examination/ConfirmExamDialog";
import ExamPreStart from "@/components/examination/ExamPreStart";
import ExamStepper from "@/components/examination/ExamStepper";
import ExamTabs from "@/components/examination/ExamTabs";
import ExamTimer from "@/components/examination/ExamTimer";
import MedicalHistoryCard from "@/components/examination/MedicalHistoryCard";
import MedicalHistoryStep from "@/components/examination/MedicalHistoryStep";
import useHistoryAutosave from "@/hooks/useHistoryAutosave";
import PatientCard from "@/components/examination/PatientCard";
import PatientInfoCard from "@/components/examination/PatientInfoCard";
import PreviousVisitsCard from "@/components/examination/PreviousVisitsCard";
import QueuePanel from "@/components/examination/QueuePanel";
import StepHeading from "@/components/examination/StepHeading";
import Breadcrumb from "@/components/navigation/Breadcrumb";
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
import { MOCK_EXAM_DIAGNOSES, MOCK_EXAM_FILMS, MOCK_EXAM_SYMPTOMS, MOCK_EXAM_TOOTH_ENTRIES } from "@/utils/data/mockExamination";
import { cx } from "@/utils/cx";
import { EXAM_STEP_TITLES, EXAM_STEPS, EXAM_TAB, EXAM_TABS, GENERIC_ERROR_MESSAGE, QUEUE_STATUS } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const STEP = { HISTORY: 0, EXAM: 1 };
const PRE_START_TABS = [EXAM_TAB.PROFILE, EXAM_TAB.EXAM];
const LOCKED_TABS = EXAM_TABS.map((tab) => tab.key).filter((key) => !PRE_START_TABS.includes(key));
const TAB_ID = "exam";

const NOT_STARTED_STATUS = {
    [QUEUE_STATUS.CALLED]: { label: "Đã gọi · chờ vào phòng", tone: "warning" },
    [QUEUE_STATUS.WAITING]: { label: "Đang chờ", tone: "neutral" },
};

// Step 2 sample data is only for the first patient of the mock queue.
const SAMPLE_EXAM = { symptoms: MOCK_EXAM_SYMPTOMS, note: "", entries: MOCK_EXAM_TOOTH_ENTRIES, films: MOCK_EXAM_FILMS, diagnoses: MOCK_EXAM_DIAGNOSES };
const EMPTY_EXAM = { symptoms: [], note: "", entries: [], films: [], diagnoses: [] };

// Patient shown on the right: the one in the room, else the one called, else the first in line.
const defaultSelection = (queue) =>
    (queue.find((item) => item.status === QUEUE_STATUS.IN_EXAMINATION) ?? queue.find((item) => item.status === QUEUE_STATUS.CALLED) ?? queue[0])?.id ?? null;

const EmptyMain = ({ text }) => (
    <div className="card-app flex flex-col items-center gap-2 py-16 text-center text-muted">
        <Stethoscope className="size-8" aria-hidden="true" />
        <p>{text}</p>
    </div>
);

// Steps 3–5 are built in their own tasks.
const PendingStep = ({ title, onBack }) => (
    <div className="card-app flex flex-col items-center gap-3 py-14 text-center">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-muted">Bước này đang được xây dựng.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
            Quay lại bước Khám & Chẩn đoán
        </button>
    </div>
);

// Patient called (or still waiting): profile with an editable medical history (draft saved automatically),
// "Khám" tab tells the doctor to start the exam.
const NotStartedView = ({ item, record, onHistoryChange }) => {
    const [tab, setTab] = useState(EXAM_TAB.EXAM);
    const { patient } = record;
    const { history, setHistory, statusText } = useHistoryAutosave(item.id, record.history, onHistoryChange);

    return (
        <>
            <PatientCard patient={{ ...patient, queueNumber: item.queueNumber }} status={NOT_STARTED_STATUS[item.status]} services={record.services}>
                <ExamTabs value={tab} onChange={setTab} disabledKeys={LOCKED_TABS} idPrefix={TAB_ID} />
            </PatientCard>
            <div role="tabpanel" id={`${TAB_ID}-panel-${tab}`} aria-labelledby={`${TAB_ID}-tab-${tab}`} className="flex flex-col gap-5">
                {tab === EXAM_TAB.PROFILE ? (
                    <>
                        <PatientInfoCard patient={patient} reason={record.intake.reason} />
                        <MedicalHistoryCard history={history} gender={patient.gender} saveStatus={statusText} onChange={setHistory} />
                        <PreviousVisitsCard queueId={item.id} visits={record.visits} />
                    </>
                ) : (
                    <ExamPreStart intake={{ ...record.intake, allergies: history.allergies, conditions: history.conditions }} />
                )}
            </div>
        </>
    );
};

// Exam in progress: process stepper, patient card with timer, then the content of the step being viewed.
const InExamView = ({ item, record, busy, onHistoryChange, onStep, onEnd }) => {
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
                        { label: "Khám bệnh", href: ROUTES.DOCTOR_QUEUE },
                        { label: `Lượt khám ${record.encounterCode}` },
                        { label: shown === STEP.HISTORY ? "Thông tin bệnh nhân" : EXAM_STEPS[shown] },
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
            <StepHeading index={shown} total={EXAM_STEPS.length} title={EXAM_STEP_TITLES[shown]} nextLabel={EXAM_STEPS[shown + 1]} />

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
                    allergies={record.history.allergies}
                    initial={item.id === 1 ? SAMPLE_EXAM : EMPTY_EXAM}
                    busy={busy}
                    onEnd={onEnd}
                    onComplete={() => goTo(STEP.EXAM + 1)}
                />
            )}
            {shown > STEP.EXAM && <PendingStep title={EXAM_STEP_TITLES[shown]} onBack={() => goTo(STEP.EXAM)} />}
        </>
    );
};

const ExaminationPage = () => {
    const [workspace, setWorkspace] = useState(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [record, setRecord] = useState(null); // { id, data, failed }
    const [collapsed, setCollapsed] = useState(false);
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

    const handleConfirm = async () => {
        const { type, item } = confirm;
        const done = await runAction(type === "absent" ? markAbsent : endExamination, item.id, defaultSelection);
        if (done) setConfirm(null);
    };

    const updateHistory = (history) => setRecord((current) => (current?.data ? { ...current, data: { ...current.data, history } } : current));

    const renderMain = () => {
        if (loadFailed) return <p role="alert" className="alert alert-danger">{GENERIC_ERROR_MESSAGE}</p>;
        if (!workspace) return <div className="skeleton h-64 rounded-lg" aria-hidden="true" />;
        if (!selected) return <EmptyMain text="Chọn bệnh nhân trong hàng chờ để xem hồ sơ và bắt đầu khám." />;
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
                    onStep={(step) => runAction((id) => setExamStep(id, step), selected.id, keep)}
                    onEnd={() => setConfirm({ type: "end", item: selected })}
                />
            );
        }
        return <NotStartedView key={selected.id} item={selected} record={record.data} onHistoryChange={updateHistory} />;
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
                        onToggleCollapse={() => setCollapsed((current) => !current)}
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
