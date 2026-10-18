import DashboardOverview from "@/components/dashboard/DashboardOverview";

// TODO: temporary dashboard.
const STATS = [
    { label: "Yêu cầu chụp phim hôm nay" },
    { label: "Đang chờ chụp" },
    { label: "Đã hoàn thành" },
    { label: "Kết quả chờ tải lên" },
];

const ImagingTechnicianDashboard = () => <DashboardOverview title="Tổng quan - Kỹ thuật viên" stats={STATS} />;

export default ImagingTechnicianDashboard;
