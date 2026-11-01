import { Users } from "lucide-react";

// "Bệnh nhân tiếp theo" banner: queue number, name + tags chip, a detail line and an action (e.g. "Gọi bệnh nhân tiếp").
// tags: "Có hẹn 08:30 · Nam · 28 tuổi"; detail: "Đau răng, muốn lấy cao răng · Check-in 08:21".
// Without a name it shows emptyText instead (nobody waiting).
const NextPatientCard = ({
    eyebrow = "Bệnh nhân tiếp theo",
    queueNumber,
    name,
    tags,
    detail,
    action,
    emptyText = "Chưa có bệnh nhân trong hàng chờ.",
}) => {
    if (!name) {
        return (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-primary-softer p-4 md:p-5">
                <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Users className="size-6" />
                </span>
                <p className="text-body-sm text-muted">{emptyText}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-primary-softer p-4 md:flex-row md:items-center md:p-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="num flex size-12 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-heading-3 text-on-primary">
                    <span className="sr-only">Số thứ tự </span>
                    {queueNumber}
                </span>
                <div className="min-w-0">
                    <p className="text-caption font-semibold text-primary">{eyebrow}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <p className="text-heading-3 text-ink">{name}</p>
                        {tags && <span className="chip-queue num">{tags}</span>}
                    </div>
                    {detail && <p className="num mt-0.5 text-caption text-muted">{detail}</p>}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
};

export default NextPatientCard;
