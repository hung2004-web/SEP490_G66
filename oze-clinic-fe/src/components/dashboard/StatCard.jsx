import { Link } from "react-router-dom";

// Number tile linking to its page. It lays itself out by its own width (container query), not the screen's:
// narrow (two tiles side by side on a phone) puts the icon above the text, wider puts it on the left.
const StatCard = ({ icon: Icon, label, value, caption, to, loading = false }) => (
    <Link to={to} aria-busy={loading || undefined} className="card-app @container p-4 transition-colors hover:border-primary sm:p-6">
        <div className="flex flex-col items-start gap-3 @[13rem]:flex-row @[13rem]:gap-4">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary @[13rem]:size-12">
                <Icon className="size-5 @[13rem]:size-6" />
            </span>
            <div className="min-w-0">
                <p className="stat-label">{label}</p>
                {loading ? (
                    <div aria-hidden="true">
                        <div className="skeleton mt-2 h-8 w-20" />
                        <div className="skeleton mt-2 h-4 w-28" />
                    </div>
                ) : (
                    <>
                        <p className="stat-value">{value}</p>
                        {caption && <p className="mt-1 text-caption text-muted">{caption}</p>}
                    </>
                )}
            </div>
        </div>
    </Link>
);

export default StatCard;
