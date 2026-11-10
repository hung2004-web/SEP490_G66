import { displayText } from "@/utils/medicalRecord";

// "08:21 · Có hẹn 08:30" / "08:21 · Vãng lai"
const checkInText = (checkInAt, appointmentTime) =>
    [checkInAt, appointmentTime ? `Có hẹn ${appointmentTime}` : "Vãng lai"].filter(Boolean).join(" · ");

const listText = (value) => (Array.isArray(value) ? value.filter(Boolean).join(", ") : value);

// What reception recorded at check-in: reason for the visit, underlying conditions, check-in time.
const IntakeSummary = ({ reason, conditions, checkInAt, appointmentTime }) => {
    const rows = [
        ["Lý do khám", displayText(reason)],
        ["Bệnh nền", displayText(listText(conditions) || "Không")],
        ["Check-in", checkInText(checkInAt, appointmentTime)],
    ];

    return (
        <dl className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-md bg-surface-tint px-4 py-3 text-body-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="contents">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium text-ink">{value}</dd>
                </div>
            ))}
        </dl>
    );
};

export default IntakeSummary;
