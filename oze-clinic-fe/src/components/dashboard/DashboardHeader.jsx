// Dashboard greeting: title (e.g. "Chào buổi sáng, BS. Trần Minh Khoa"), a subtitle line
// (e.g. "Thứ Hai, 19/10/2026 · Ca sáng 08:00 – 12:00 · Phòng khám") and buttons on the right.
const DashboardHeader = ({ title, subtitle, actions }) => (
    <div className="page-header items-start">
        <div className="min-w-0">
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-description num">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
);

export default DashboardHeader;
