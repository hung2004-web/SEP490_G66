import DashboardOverview from "@/components/dashboard/DashboardOverview";

// TODO: temporary dashboard.
const STATS = [
    { label: "Lịch hẹn hôm nay" },
    { label: "Bệnh nhân đang chờ" },
    { label: "Kế hoạch điều trị đang theo dõi" },
    { label: "Yêu cầu chụp phim" },
];

const DoctorDashboard = () => <DashboardOverview title="Tổng quan - Bác sĩ" stats={STATS} />;

export default DoctorDashboard;
