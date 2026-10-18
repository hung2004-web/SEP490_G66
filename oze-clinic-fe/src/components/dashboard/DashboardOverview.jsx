import Card from "@/components/ui/Card";
import useSession from "@/hooks/useSession";

const EMPTY_VALUE = "—";

// Dashboard frame: page title, greeting, a row of stat cards, then any extra content (charts, tables...).
// stats: [{ label, value }]; a missing value shows "—".
const DashboardOverview = ({ title, description, stats = [], children }) => {
    const { userName } = useSession();

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{title}</h1>
                    <p className="page-description">
                        {description ?? `Xin chào${userName ? `, ${userName}` : ""}!`}
                    </p>
                </div>
            </div>
            {stats.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map(({ label, value }) => (
                        <Card key={label}>
                            <p className="stat-label">{label}</p>
                            <p className="stat-value">{value ?? EMPTY_VALUE}</p>
                        </Card>
                    ))}
                </div>
            )}
            {children && <div className="mt-6">{children}</div>}
        </>
    );
};

export default DashboardOverview;
