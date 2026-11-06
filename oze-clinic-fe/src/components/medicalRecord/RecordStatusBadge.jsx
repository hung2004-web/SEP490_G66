import StatusBadge from "@/components/ui/StatusBadge";
import { displayText } from "@/utils/medicalRecord";

const RecordStatusBadge = ({ status, labels }) =>
    Object.hasOwn(labels, status) ? <StatusBadge status={status} labels={labels} /> : <span className="text-caption text-muted">{displayText(status)}</span>;

export default RecordStatusBadge;
