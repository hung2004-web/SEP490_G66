import Drawer from "@/components/ui/Drawer";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { MEDICAL_RECORD_STATUS_GUIDE } from "@/utils/messages";

const StatusDefinitionDrawer = ({ onClose, groups = MEDICAL_RECORD_STATUS_GUIDE, titleClassName = "text-placeholder" }) => (
    <Drawer title="Định nghĩa trạng thái" onClose={onClose}>
        <div className="flex flex-col gap-5">
            {groups.map((group) => (
                <section key={group.title}>
                    <h3 className={cx("mb-2 text-caption font-semibold uppercase tracking-wide", titleClassName)}>{group.title}</h3>
                    <div className="flex flex-col gap-2">
                        {group.items.map((item) => (
                            <div key={item.key} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                                <span>
                                    {group.labels ? <StatusBadge status={item.key} labels={group.labels} /> : <b className="font-semibold text-ink">{item.term}</b>}
                                </span>
                                <p className="text-ink">{item.meaning}</p>
                                {item.when && (
                                    <p className="text-caption">
                                        <b>Khi nào:</b> {item.when}
                                    </p>
                                )}
                                {item.patient && (
                                    <p className="text-caption">
                                        <b>Bệnh nhân:</b> {item.patient}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    </Drawer>
);

export default StatusDefinitionDrawer;
