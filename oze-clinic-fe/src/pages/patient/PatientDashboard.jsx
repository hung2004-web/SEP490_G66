import DashboardOverview from "@/components/dashboard/DashboardOverview";

// TODO: temporary dashboard.
const STATS = [
    { label: "Lịch hẹn sắp tới" },
    { label: "Kế hoạch điều trị" },
    { label: "Hóa đơn chưa thanh toán" },
    { label: "Thông báo mới" },
];

const PatientDashboard = () => <DashboardOverview title="Tổng quan" stats={STATS} />;

export default PatientDashboard;
