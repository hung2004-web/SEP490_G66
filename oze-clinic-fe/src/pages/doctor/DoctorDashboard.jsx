import { useState } from "react";
import { Clock, ListChecks, ScanLine, Stethoscope, Users } from "lucide-react";
import { toast } from "react-toastify";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSection from "@/components/dashboard/DashboardSection";
import NextPatientCard from "@/components/dashboard/NextPatientCard";
import StatCard from "@/components/dashboard/StatCard";
import TaskItem from "@/components/dashboard/TaskItem";
import PersonCell from "@/components/ui/PersonCell";
import useAsync from "@/hooks/useAsync";
import useSession from "@/hooks/useSession";
import { callNextPatient, getDoctorDashboard } from "@/services/doctorWorkService";
import { DOCTOR_TASK_TYPES } from "@/utils/data/mockDoctorDashboard";
import { formatDate, formatWeekday, toDateOnly } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const QUEUE_TITLE_ID = "doctor-dashboard-queue";
const TASKS_TITLE_ID = "doctor-dashboard-tasks";
const QUEUE_SKELETON_ROWS = 4;

const TASK_META = {
    [DOCTOR_TASK_TYPES.IMAGING_REVIEW]: { icon: ScanLine, to: ROUTES.DOCTOR_IMAGING_REVIEWS },
};

const joinParts = (parts) => parts.filter(Boolean).join(" · ");

// "Có hẹn 08:30 · Dị ứng Penicillin" / "Vãng lai"
const visitNote = (patient) =>
    joinParts([patient.appointmentTime ? `Có hẹn ${patient.appointmentTime}` : "Vãng lai", patient.allergy && `Dị ứng ${patient.allergy}`]);

const percentOf = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const QueueTable = ({ queue, roomName, loading }) => (
    <DashboardSection
        id={QUEUE_TITLE_ID}
        title={`Hàng chờ khám · ${roomName ?? "Phòng khám"}`}
        busy={loading}
        link={!loading && queue.length > 0 && { to: ROUTES.DOCTOR_QUEUE, label: "Xem tất cả" }}
        empty={!loading && queue.length === 0 && { icon: Users, text: "Hàng chờ đang trống." }}
    >
        {loading && (
            <div aria-hidden="true" className="flex flex-col gap-3">
                {Array.from({ length: QUEUE_SKELETON_ROWS }, (_, index) => (
                    <div key={index} className="skeleton h-10" />
                ))}
            </div>
        )}
        {!loading && queue.length > 0 && (
            <div className="table-wrap -m-6 rounded-t-none rounded-b-lg border-0">
                <table className="table" aria-labelledby={QUEUE_TITLE_ID}>
                    <thead>
                        <tr>
                            <th scope="col">STT</th>
                            <th scope="col">Bệnh nhân</th>
                            <th scope="col">Dịch vụ</th>
                            <th scope="col">Chờ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {queue.map((patient) => (
                            <tr key={patient.id}>
                                <td className="cell-primary num">{patient.queueNumber}</td>
                                <td className="min-w-52">
                                    <PersonCell name={patient.patientName} detail={visitNote(patient)} />
                                </td>
                                <td className="min-w-48">{patient.reason}</td>
                                <td className="num whitespace-nowrap">{patient.waitedMinutes} ph</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </DashboardSection>
);

const TasksPanel = ({ tasks, loading }) => (
    <DashboardSection
        id={TASKS_TITLE_ID}
        title="Việc đang chờ bạn"
        busy={loading}
        empty={!loading && tasks.length === 0 && { icon: ListChecks, text: "Bạn không có việc nào đang chờ." }}
    >
        {loading && (
            <div aria-hidden="true" className="flex flex-col gap-3">
                <div className="skeleton h-16" />
                <div className="skeleton h-16" />
                <div className="skeleton h-16" />
            </div>
        )}
        {!loading && tasks.length > 0 && (
            <ul className="flex flex-col gap-3">
                {tasks.map((task) => (
                    <li key={task.id}>
                        <TaskItem
                            icon={TASK_META[task.type]?.icon}
                            title={task.title}
                            detail={task.detail}
                            badge={{ label: task.status, tone: "warning" }}
                            to={TASK_META[task.type]?.to ?? ROUTES.DASHBOARD}
                        />
                    </li>
                ))}
            </ul>
        )}
    </DashboardSection>
);

const DoctorDashboard = () => {
    const { userName } = useSession();
    const [reloadKey, setReloadKey] = useState(0);
    const [calling, setCalling] = useState(false);
    const { loading, value: result } = useAsync(() => getDoctorDashboard(), [reloadKey]);

    const failed = !loading && result?.success === false;
    const data = result?.success ? result.data : null;
    const stats = data?.stats;
    const queue = data?.queue ?? [];
    const [next] = queue;
    const shift = data?.shift;

    const todayDate = toDateOnly(new Date());
    const subtitle = `${formatWeekday(todayDate)}, ${formatDate(todayDate)}`;

    const handleCallNext = async () => {
        setCalling(true);
        const response = await callNextPatient();
        setCalling(false);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        toast.success(response.message);
        setReloadKey((current) => current + 1);
    };

    return (
        <div className="flex flex-col gap-6">
            <DashboardHeader title={`Chào mừng${userName ? `, ${userName}` : ""}`} subtitle={subtitle} />

            {failed && (
                <p role="alert" className="alert alert-danger">
                    {GENERIC_ERROR_MESSAGE}
                </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={Users}
                    label="Bệnh nhân hôm nay"
                    value={stats?.totalToday}
                    caption={stats && joinParts([`${stats.waiting} chờ`, stats.inExamination > 0 && `${stats.inExamination} đang khám`, `${stats.completed} đã khám`])}
                    to={ROUTES.DOCTOR_QUEUE}
                    loading={loading}
                />
                <StatCard
                    icon={Clock}
                    label="Đang chờ"
                    value={stats?.waiting}
                    caption={stats && (stats.waiting > 0 ? `Chờ lâu nhất ${stats.longestWaitMinutes} phút` : "Không có ai đang chờ")}
                    to={ROUTES.DOCTOR_QUEUE}
                    loading={loading}
                />
                <StatCard
                    icon={Stethoscope}
                    label="Đã hoàn thành"
                    value={stats?.completed}
                    caption={stats && `${percentOf(stats.completed, stats.totalToday)}% bệnh nhân hôm nay`}
                    to={ROUTES.DOCTOR_PATIENTS}
                    loading={loading}
                />
                <StatCard
                    icon={ScanLine}
                    label="Ảnh chụp chờ duyệt"
                    value={stats?.pendingImagingResults}
                    caption="Kỹ thuật viên đã gửi"
                    to={ROUTES.DOCTOR_IMAGING_REVIEWS}
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                <div className="flex min-w-0 flex-col gap-6">
                    {loading ? (
                        <div className="skeleton h-24 rounded-lg" aria-hidden="true" />
                    ) : (
                        <NextPatientCard
                            eyebrow="Bệnh nhân tiếp theo · Hàng chờ khám"
                            queueNumber={next?.queueNumber}
                            name={next?.patientName}
                            tags={next && joinParts([next.appointmentTime && `Có hẹn ${next.appointmentTime}`, next.gender, `${next.age} tuổi`])}
                            detail={next && joinParts([next.reason, `Check-in ${next.checkInAt}`])}
                            action={
                                <button type="button" className="btn btn-primary" disabled={calling} onClick={handleCallNext}>
                                    {calling && <span className="btn-spinner" aria-hidden="true" />}
                                    Gọi bệnh nhân tiếp
                                </button>
                            }
                        />
                    )}
                    <QueueTable queue={queue} roomName={shift?.roomName} loading={loading} />
                </div>
                <TasksPanel tasks={data?.tasks ?? []} loading={loading} />
            </div>
        </div>
    );
};

export default DoctorDashboard;
