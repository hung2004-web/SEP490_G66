import { Navigate } from "react-router-dom";
import useSession from "@/hooks/useSession";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import DoctorDashboard from "@/pages/doctor/DoctorDashboard";
import ImagingTechnicianDashboard from "@/pages/imagingTechnician/ImagingTechnicianDashboard";
import PatientDashboard from "@/pages/patient/PatientDashboard";
import ReceptionistDashboard from "@/pages/receptionist/ReceptionistDashboard";
import { USER_ROLES } from "@/utils/messages";
import { getErrorRoute } from "@/utils/routes";

const DASHBOARDS = {
    [USER_ROLES.PATIENT]: PatientDashboard,
    [USER_ROLES.DOCTOR]: DoctorDashboard,
    [USER_ROLES.DENTAL_IMAGING_TECHNICIAN]: ImagingTechnicianDashboard,
    [USER_ROLES.RECEPTIONIST]: ReceptionistDashboard,
    [USER_ROLES.CLINIC_MANAGER]: AdminDashboard,
};

// /dashboard is shared: each role sees its own dashboard.
const DashboardPage = () => {
    const { role } = useSession();
    const Dashboard = DASHBOARDS[role];

    return Dashboard ? <Dashboard /> : <Navigate to={getErrorRoute(403)} replace />;
};

export default DashboardPage;
