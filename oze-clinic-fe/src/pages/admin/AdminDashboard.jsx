import DashboardOverview from "@/components/dashboard/DashboardOverview";

// TODO: temporary dashboard.
const STATS = [
    { label: "Doanh thu hôm nay" },
    { label: "Lịch hẹn hôm nay" },
    { label: "Nhân viên đang làm việc" },
    { label: "Bệnh nhân mới trong tháng" },
];

const AdminDashboard = () => <DashboardOverview title="Tổng quan - Quản lý" stats={STATS} />;

export default AdminDashboard;
