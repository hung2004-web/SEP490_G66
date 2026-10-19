import DashboardOverview from "@/components/dashboard/DashboardOverview";

// TODO: temporary dashboard.
const STATS = [
    { label: "Lịch hẹn hôm nay" },
    { label: "Bệnh nhân đã check-in" },
    { label: "Yêu cầu tư vấn mới" },
    { label: "Hóa đơn chờ thu" },
];

const ReceptionistDashboard = () => <DashboardOverview title="Tổng quan - Lễ tân" stats={STATS} />;

export default ReceptionistDashboard;
