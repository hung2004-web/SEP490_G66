import { Link } from "react-router-dom";

const StatCard = ({ icon: Icon, label, value, caption, to, loading = false }) => (
    <Link to={to} aria-busy={loading || undefined} className="card-app flex items-start gap-4 transition-colors hover:border-primary">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Icon className="size-6" />
        </span>
        <div className="min-w-0">
            <p className="stat-label">{label}</p>
            {loading ? (
                <div aria-hidden="true">
                    <div className="skeleton mt-2 h-8 w-24" />
                    <div className="skeleton mt-2 h-4 w-40" />
                </div>
            ) : (
                <>
                    <p className="stat-value">{value}</p>
                    {caption && <p className="mt-1 text-caption text-muted">{caption}</p>}
                </>
            )}
        </div>
    </Link>
);

export default StatCard;
