import { ArrowRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS, AUDIT_ENTITY_OPTIONS } from "@/utils/data/mockAuditLogs";
import { getClinicDateTimeParts } from "@/utils/format";

const DATA_TITLES = {
    [AUDIT_ACTIONS.CREATE]: "Dữ liệu được tạo",
    [AUDIT_ACTIONS.DELETE]: "Dữ liệu đã xoá",
};

const SectionTitle = ({ children }) => <h3 className="text-body-sm font-semibold text-ink">{children}</h3>;

const DetailTable = ({ rows }) => (
    <dl className="mt-2 divide-y divide-border rounded-lg border border-border">
        {rows.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-2.5">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium break-words text-ink">{value}</dd>
            </div>
        ))}
    </dl>
);

const ChangeList = ({ changes }) => (
    <>
        <div className="flex items-center justify-between gap-3">
            <SectionTitle>Nội dung thay đổi</SectionTitle>
            <p className="num text-caption text-muted">{changes.length} trường thay đổi</p>
        </div>
        <ul className="mt-2 flex flex-col gap-3">
            {changes.map(({ field, before, after }) => (
                <li key={field} className="rounded-lg border border-border p-3">
                    <p className="font-semibold text-ink">{field}</p>
                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                        <div className="h-full rounded-md bg-danger-soft px-3 py-2">
                            <p className="text-caption text-muted">Trước</p>
                            <del className="font-semibold text-danger">{before}</del>
                        </div>
                        <ArrowRight className="size-4 text-muted" aria-hidden="true" />
                        <div className="h-full rounded-md bg-success-soft px-3 py-2">
                            <p className="text-caption text-muted">Sau</p>
                            <p className="font-semibold text-success">{after}</p>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </>
);

// "Chi tiết nhật ký" popup, read only. The content follows log.action, not which values are present.
const AuditLogDetailPopup = ({ log, onClose }) => {
    const { label, variant } = AUDIT_ACTION_LABELS[log.action];
    const entityLabel = AUDIT_ENTITY_OPTIONS.find((option) => option.value === log.entityType)?.label ?? log.entityType;
    const { date, time } = getClinicDateTimeParts(log.createdAt);

    const generalRows = [
        { label: "Người dùng", value: `${log.userName} · ${log.userRole}` },
        { label: "Mã người dùng", value: <span className="num">{log.userId}</span> },
        { label: "Đối tượng", value: log.entityName ? `${entityLabel} · ${log.entityName}` : entityLabel },
        { label: "Mã đối tượng", value: <span className="num">#{log.entityId}</span> },
        { label: "Thời gian", value: <span className="num">{date} {time}</span> },
        { label: "Địa chỉ IP", value: <span className="num">{log.ipAddress}</span> },
        { label: "Trình duyệt / thiết bị", value: log.userAgent },
    ];

    return (
        <Modal
            title={
                <span className="flex flex-wrap items-center gap-2">
                    {label} {entityLabel.toLocaleLowerCase("vi")}
                    <Badge variant={variant}>{label}</Badge>
                </span>
            }
            description={`Nhật ký #${log.id} · ${date} ${time}`}
            onClose={onClose}
        >
            <section className="mt-5">
                <SectionTitle>Thông tin chung</SectionTitle>
                <DetailTable rows={generalRows} />
            </section>

            <section className="mt-5">
                {log.action === AUDIT_ACTIONS.UPDATE ? (
                    <ChangeList changes={log.changes} />
                ) : (
                    <>
                        <SectionTitle>{DATA_TITLES[log.action]}</SectionTitle>
                        <DetailTable
                            rows={log.data.map((item) => ({
                                label: item.field,
                                value: item.badge ? <Badge variant={item.badge}>{item.value}</Badge> : item.value,
                            }))}
                        />
                    </>
                )}
            </section>

            {log.action === AUDIT_ACTIONS.DELETE && (
                <p className="alert alert-danger mt-3 border-0">Dữ liệu này đã bị xoá khỏi hệ thống, chỉ còn lưu lại trong nhật ký.</p>
            )}

            <div className="modal-actions -mx-6 items-center justify-between border-t border-border px-6 pt-4">
                <p className="text-caption text-muted">Nhật ký chỉ đọc, không sửa hoặc xoá được.</p>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
            </div>
        </Modal>
    );
};

export default AuditLogDetailPopup;
