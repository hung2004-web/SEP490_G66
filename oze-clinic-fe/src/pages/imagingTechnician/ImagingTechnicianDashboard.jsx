import DashboardOverview from "@/components/dashboard/DashboardOverview";
import MyShiftBar from "@/components/staff/MyShiftBar";
import { ROUTES } from "@/utils/routes";

// TODO: temporary dashboard.
const STATS = [{ label: "Yêu cầu chụp phim hôm nay" }, { label: "Đang chờ chụp" }, { label: "Đã hoàn thành" }, { label: "Kết quả chờ tải lên" }];

const ImagingTechnicianDashboard = () => (
    <DashboardOverview title="Tổng quan - Kỹ thuật viên" stats={STATS}>
        <MyShiftBar queueTo={ROUTES.TECHNICIAN_IMAGING_REQUESTS} queueLabel="Mở danh sách chụp phim" />
    </DashboardOverview>
);

export default ImagingTechnicianDashboard;
