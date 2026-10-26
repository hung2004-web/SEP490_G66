import { Construction } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/routes";

// Shown inside the app layout for sidebar pages that are not built yet, so the sidebar and header stay usable.
const ComingSoonPage = ({ title }) => (
    <>
        <h1 className="page-title mb-6">{title}</h1>
        <div className="card-app empty-state">
            <Construction className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-title">Chức năng đang được phát triển</p>
            <p className="empty-state-text">Trang này sẽ sớm được cập nhật. Bạn có thể dùng các mục khác trên thanh bên.</p>
            <Link to={ROUTES.DASHBOARD} className="btn btn-secondary mt-6">
                Về trang tổng quan
            </Link>
        </div>
    </>
);

export default ComingSoonPage;
