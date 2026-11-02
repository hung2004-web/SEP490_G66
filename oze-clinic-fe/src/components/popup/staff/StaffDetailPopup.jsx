import { useState } from "react";
import { Award, Pencil } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, LOCK_REASON_OPTIONS, STAFF_ROLE_OPTIONS } from "@/utils/data/mockStaff";
import { formatDate } from "@/utils/format";
import { GENDER_LABELS, USER_ROLES } from "@/utils/messages";

const labelOf = (options, value) => options.find((option) => option.value === value)?.label ?? value;

// "0918777888" -> "0918 777 888"
const formatPhone = (phone) => phone.replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

const DetailItem = ({ label, className, children }) => (
    <div className={className}>
        <dt className="text-caption text-muted">{label}</dt>
        <dd className="mt-1 text-body-sm text-ink">{children}</dd>
    </div>
);

// Doctor only: thumbnails of the certificate scans; clicking one opens it larger.
const CertificateList = ({ certificates, onView }) => (
    <section aria-labelledby="staff-certificates-title" className="mt-5 border-t border-border pt-5">
        <h3 id="staff-certificates-title" className="text-title text-ink">
            Chứng chỉ ({certificates.length})
        </h3>
        {certificates.length === 0 ? (
            <div className="empty-state py-6">
                <Award className="empty-state-icon" aria-hidden="true" />
                <p className="empty-state-title">Chưa có chứng chỉ nào</p>
            </div>
        ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {certificates.map((certificate) => (
                    <li key={certificate.id}>
                        <button
                            type="button"
                            className="group flex w-full flex-col overflow-hidden rounded-lg border border-border text-left hover:border-primary focus-visible:border-primary"
                            aria-label={`Xem ${certificate.name}`}
                            onClick={() => onView(certificate)}
                        >
                            <img
                                src={certificate.imageUrl}
                                alt=""
                                loading="lazy"
                                className="aspect-4/3 w-full bg-surface-tint object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span className="flex flex-col gap-0.5 border-t border-border p-2.5">
                                <span className="line-clamp-2 text-caption font-semibold text-ink">{certificate.name}</span>
                                <span className="truncate text-caption font-normal text-muted">{certificate.issuer}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        )}
    </section>
);

// Larger view of one certificate scan, over the detail popup.
const CertificateViewer = ({ certificate, onClose }) => (
    <Modal title={certificate.name} description={certificate.issuer} size="lg" onClose={onClose}>
        <img src={certificate.imageUrl} alt={certificate.name} className="mt-5 max-h-[70dvh] w-full rounded-lg bg-surface-tint object-contain" />
    </Modal>
);

// "Chi tiết tài khoản" popup, read only. onEdit opens the update popup for the same account.
// No initial focus target: the dialog itself takes focus, so it opens scrolled to the top (not at the buttons below
// a doctor's certificates).
const StaffDetailPopup = ({ member, onClose, onEdit }) => {
    const [viewing, setViewing] = useState(null);
    const locked = member.status === ACCOUNT_STATUSES.LOCKED;
    const isDoctor = member.role === USER_ROLES.DOCTOR;

    return (
        <Modal title="Chi tiết tài khoản" size={isDoctor ? "md" : undefined} onClose={onClose}>
            <div className="mt-5 flex items-center gap-4 rounded-lg bg-surface-tint p-4">
                <Avatar fullName={member.fullName} size="lg" className="avatar-soft size-12 text-heading-3" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-heading-3 text-ink">{member.fullName}</p>
                        <StatusBadge status={member.status} labels={ACCOUNT_STATUS_LABELS} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-body-sm text-muted">
                        <span className="font-semibold text-primary">{labelOf(STAFF_ROLE_OPTIONS, member.role)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="num">{member.code}</span>
                    </p>
                </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailItem label="Giới tính">{GENDER_LABELS[member.gender] ?? <span className="text-muted">—</span>}</DetailItem>
                <DetailItem label="Ngày sinh">
                    {member.birthDate ? <span className="num">{formatDate(member.birthDate)}</span> : <span className="text-muted">—</span>}
                </DetailItem>
                <DetailItem label="Email">{member.email}</DetailItem>
                <DetailItem label="Số điện thoại">
                    <span className="num">{formatPhone(member.phone)}</span>
                </DetailItem>
                {locked && member.lock && (
                    <DetailItem label="Lý do khoá" className="sm:col-span-2">
                        {labelOf(LOCK_REASON_OPTIONS, member.lock.reason)}
                        {member.lock.note && <span className="text-muted"> · {member.lock.note}</span>}
                    </DetailItem>
                )}
            </dl>

            {isDoctor && <CertificateList certificates={member.certificates ?? []} onView={setViewing} />}

            <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
                <button type="button" className="btn btn-primary" onClick={() => onEdit(member)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Chỉnh sửa
                </button>
            </div>

            {viewing && <CertificateViewer certificate={viewing} onClose={() => setViewing(null)} />}
        </Modal>
    );
};

export default StaffDetailPopup;
