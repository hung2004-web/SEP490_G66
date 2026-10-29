import { Eye, Lock, LockOpen, Pencil, Users } from "lucide-react";
import PersonCell from "@/components/ui/PersonCell";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, STAFF_ROLE_OPTIONS } from "@/utils/data/mockStaff";
import { formatDate } from "@/utils/format";

const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 7;
const ACTION_CLASS = "btn btn-secondary btn-icon size-8";

const roleLabel = (role) => STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

// "0918777888" -> "0918 777 888"
const formatPhone = (phone) => phone.replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

const StaffRow = ({ member, onView, onEdit, onLock, onUnlock }) => {
    const locked = member.status === ACCOUNT_STATUSES.LOCKED;

    return (
        <tr>
            <td className="cell-primary whitespace-nowrap">{member.code}</td>
            <td className="min-w-56">
                <PersonCell name={member.fullName} detail={member.email} />
            </td>
            <td>
                <span className="chip-queue whitespace-nowrap">{roleLabel(member.role)}</span>
            </td>
            <td className="num whitespace-nowrap">{formatPhone(member.phone)}</td>
            <td className="num whitespace-nowrap">{formatDate(member.startDate)}</td>
            <td>
                <span title={locked ? member.lockReason ?? undefined : undefined}>
                    <StatusBadge status={member.status} labels={ACCOUNT_STATUS_LABELS} />
                </span>
            </td>
            <td>
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className={ACTION_CLASS}
                        aria-label={`Xem ${member.code}`}
                        title="Xem chi tiết"
                        onClick={() => onView(member)}
                    >
                        <Eye className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={ACTION_CLASS}
                        aria-label={`Chỉnh sửa ${member.code}`}
                        title="Chỉnh sửa"
                        onClick={() => onEdit(member)}
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={cx(ACTION_CLASS, locked ? "text-success" : "text-danger")}
                        aria-label={`${locked ? "Mở khoá" : "Khoá"} tài khoản ${member.code}`}
                        title={locked ? "Mở khoá tài khoản" : "Khoá tài khoản"}
                        onClick={() => (locked ? onUnlock(member) : onLock(member))}
                    >
                        {locked ? (
                            <LockOpen className="size-4" aria-hidden="true" />
                        ) : (
                            <Lock className="size-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </td>
        </tr>
    );
};

// Staff accounts table with loading rows and an empty state. filtered: a search or filter is on (changes the empty text).
const StaffTable = ({ staff, loading, filtered, onView, onEdit, onLock, onUnlock }) => (
    <div className="table-wrap">
        <table className="table" aria-busy={loading}>
            <thead>
                <tr>
                    <th scope="col">Mã NV</th>
                    <th scope="col">Nhân viên</th>
                    <th scope="col">Vai trò</th>
                    <th scope="col">Số điện thoại</th>
                    <th scope="col">Ngày vào làm</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">
                        <span className="sr-only">Thao tác</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                {loading &&
                    Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                        <tr key={index} aria-hidden="true">
                            {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                                <td key={cell}>
                                    <div className="skeleton h-4 w-full max-w-32" />
                                </td>
                            ))}
                        </tr>
                    ))}
                {!loading && staff.length === 0 && (
                    <tr>
                        <td colSpan={COLUMN_COUNT}>
                            <div className="empty-state">
                                <Users className="empty-state-icon" aria-hidden="true" />
                                <p className="empty-state-title">
                                    {filtered ? "Không tìm thấy nhân viên phù hợp" : "Chưa có tài khoản nhân viên nào"}
                                </p>
                                <p className="empty-state-text">
                                    {filtered ? "Thử đổi từ khóa hoặc bộ lọc." : "Bấm “Tạo tài khoản” để thêm nhân viên đầu tiên."}
                                </p>
                            </div>
                        </td>
                    </tr>
                )}
                {!loading &&
                    staff.map((member) => (
                        <StaffRow
                            key={member.id}
                            member={member}
                            onView={onView}
                            onEdit={onEdit}
                            onLock={onLock}
                            onUnlock={onUnlock}
                        />
                    ))}
            </tbody>
        </table>
    </div>
);

export default StaffTable;
