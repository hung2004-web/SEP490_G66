import { useRef } from "react";
import { Pencil } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, LOCK_REASON_OPTIONS, STAFF_ROLE_OPTIONS } from "@/utils/data/mockStaff";
import { formatDate } from "@/utils/format";
import { USER_ROLES } from "@/utils/messages";

const labelOf = (options, value) => options.find((option) => option.value === value)?.label ?? value;

// "0918777888" -> "0918 777 888"
const formatPhone = (phone) => phone.replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

const DetailItem = ({ label, className, children }) => (
    <div className={className}>
        <dt className="text-caption text-muted">{label}</dt>
        <dd className="mt-1 text-body-sm text-ink">{children}</dd>
    </div>
);

// "Chi tiết tài khoản" popup, read only. onEdit opens the update popup for the same account.
const StaffDetailPopup = ({ member, onClose, onEdit }) => {
    const closeRef = useRef(null);
    const locked = member.status === ACCOUNT_STATUSES.LOCKED;

    return (
        <Modal title="Chi tiết tài khoản" onClose={onClose} initialFocusRef={closeRef}>
            <div className="mt-6 flex items-center gap-3">
                <Avatar fullName={member.fullName} size="lg" className="avatar-soft" />
                <div className="min-w-0">
                    <p className="num text-caption text-muted">{member.code}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-heading-3 text-ink">{member.fullName}</p>
                        <StatusBadge status={member.status} labels={ACCOUNT_STATUS_LABELS} />
                    </div>
                </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
                <DetailItem label="Vai trò">{labelOf(STAFF_ROLE_OPTIONS, member.role)}</DetailItem>
                <DetailItem label="Ngày sinh">
                    {member.birthDate ? <span className="num">{formatDate(member.birthDate)}</span> : <span className="text-muted">—</span>}
                </DetailItem>
                <DetailItem label="Email">{member.email}</DetailItem>
                <DetailItem label="Số điện thoại">
                    <span className="num">{formatPhone(member.phone)}</span>
                </DetailItem>
                {member.role === USER_ROLES.DOCTOR && (
                    <DetailItem label="Số chứng chỉ hành nghề" className="sm:col-span-2">
                        <span className="num">{member.licenseNumber || "—"}</span>
                    </DetailItem>
                )}
                {locked && member.lock && (
                    <DetailItem label="Lý do khoá" className="sm:col-span-2">
                        {labelOf(LOCK_REASON_OPTIONS, member.lock.reason)}
                        {member.lock.note && <span className="text-muted"> · {member.lock.note}</span>}
                    </DetailItem>
                )}
            </dl>

            <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
                <button ref={closeRef} type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
                <button type="button" className="btn btn-primary" onClick={() => onEdit(member)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Chỉnh sửa
                </button>
            </div>
        </Modal>
    );
};

export default StaffDetailPopup;
