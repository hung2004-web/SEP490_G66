import Drawer from "@/components/ui/Drawer";
import StatusBadge from "@/components/ui/StatusBadge";
import { MEDICAL_RECORD_STATUS_GUIDE } from "@/utils/messages";

const StatusDefinitionDrawer = ({ onClose }) => (
    <Drawer title="Định nghĩa trạng thái" onClose={onClose}>
        <div className="flex flex-col gap-5">
            {MEDICAL_RECORD_STATUS_GUIDE.map((group) => (
                <section key={group.title}>
                    <h3 className="mb-2 text-caption font-semibold uppercase tracking-wide text-placeholder">{group.title}</h3>
                    <div className="flex flex-col gap-2">
                        {group.items.map((item) => (
                            <div key={item.key} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                                <span>
                                    <StatusBadge status={item.key} labels={group.labels} />
                                </span>
                                <p className="text-ink">{item.meaning}</p>
                                <p className="text-caption">
                                    <b>Khi nào:</b> {item.when}
                                </p>
                                <p className="text-caption">
                                    <b>Bệnh nhân:</b> {item.patient}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    </Drawer>
);

export default StatusDefinitionDrawer;
