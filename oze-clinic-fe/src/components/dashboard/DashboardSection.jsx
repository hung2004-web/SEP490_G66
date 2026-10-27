import { Link } from "react-router-dom";

const DashboardSection = ({ id, title, link, badge, error, empty, busy = false, children }) => {
    const EmptyIcon = empty?.icon;

    return (
        <section aria-labelledby={id} aria-busy={busy || undefined} className="card-app p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
                <h2 id={id} className="section-title">{title}</h2>
                {badge}
                {link && (
                    <Link to={link.to} className="btn btn-link min-h-11 md:min-h-0">
                        {link.label}
                        <span aria-hidden="true">›</span>
                    </Link>
                )}
            </div>
            <div className="flex flex-col gap-4 p-6">
                {error && <div role="alert" className="alert alert-danger">{error}</div>}
                {empty && (
                    <div className="empty-state flex-row flex-wrap items-center gap-4 px-0 py-4 text-left">
                        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                            <EmptyIcon className="size-6" />
                        </span>
                        <p className="empty-state-text mt-0 flex-1">{empty.text}</p>
                        {empty.action}
                    </div>
                )}
                {children}
            </div>
        </section>
    );
};

export default DashboardSection;
