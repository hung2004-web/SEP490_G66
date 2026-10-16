import { Navigate, Outlet } from "react-router-dom";
import useSession from "@/hooks/useSession";
import { getErrorRoute } from "@/utils/routes";

const RequireRole = ({ roles }) => {
    const { token, role } = useSession();

    if (!token) return <Navigate to={getErrorRoute(401)} replace />;
    if (roles && !roles.includes(role)) return <Navigate to={getErrorRoute(403)} replace />;

    return <Outlet />;
};

export default RequireRole;
