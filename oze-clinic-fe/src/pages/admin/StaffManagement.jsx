import { useEffect, useState } from "react";
import { Eye, Lock, LockOpen, Pencil, Users } from "lucide-react";
import { toast } from "react-toastify";
import LockAccountPopup from "@/components/popup/staff/LockAccountPopup";
import StaffDetailPopup from "@/components/popup/staff/StaffDetailPopup";
import StaffFormPopup from "@/components/popup/staff/StaffFormPopup";
import FilterSelect from "@/components/ui/FilterSelect";
import Pagination from "@/components/ui/Pagination";
import PersonCell from "@/components/ui/PersonCell";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import useAsync from "@/hooks/useAsync";
import { getStaffAccounts, unlockStaffAccount } from "@/services/staffService";
import { cx } from "@/utils/cx";
import { formatPhone } from "@/utils/format";
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, ACCOUNT_STATUS_OPTIONS, STAFF_ROLE_OPTIONS } from "@/utils/data/mockStaff";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 6;
const ACTION_CLASS = "btn btn-secondary btn-icon size-8";

const roleLabel = (role) => STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

const StaffRow = ({ member, onView, onEdit, onLock, onUnlock }) => {
    const locked = member.status === ACCOUNT_STATUSES.LOCKED;

    return (
        <tr>
            <td data-label="Mã NV" className="cell-primary whitespace-nowrap">{member.code}</td>
            <td data-primary className="min-w-56">
                <PersonCell name={member.fullName} detail={member.email} />
            </td>
            <td data-label="Vai trò">
                <span className="chip-queue whitespace-nowrap">{roleLabel(member.role)}</span>
            </td>
            <td data-label="Số điện thoại" className="num whitespace-nowrap">{formatPhone(member.phone)}</td>
            <td data-label="Trạng thái">
                <span title={locked ? member.lock?.note : undefined}>
                    <StatusBadge status={member.status} labels={ACCOUNT_STATUS_LABELS} />
                </span>
            </td>
            <td data-actions>
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

const StaffManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    // null = closed; { kind: "form" | "detail" | "lock", member }. A form with member = null creates an account.
    const [dialog, setDialog] = useState(null);

    const { loading, value: result } = useAsync(
        () => getStaffAccounts({ keyword, role, status, page }),
        [keyword, role, status, page, reloadKey],
    );

    useEffect(() => {
        const nextKeyword = searchInput.trim();
        if (nextKeyword === keyword) return undefined;
        const timer = setTimeout(() => {
            setKeyword(nextKeyword);
            setPage(1);
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [searchInput, keyword]);

    const data = result?.success ? result.data : null;
    const staff = data?.items ?? [];
    const filtered = Boolean(keyword || role || status);

    const changeFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const openCreate = () => setDialog({ kind: "form", member: null });
    const openView = (member) => setDialog({ kind: "detail", member });
    const openEdit = (member) => setDialog({ kind: "form", member });
    const openLock = (member) => setDialog({ kind: "lock", member });
    const closeDialog = () => setDialog(null);

    const reload = (message) => {
        toast.success(message);
        setReloadKey((current) => current + 1);
    };

    // A new account goes to the top of the list, so show page 1 without filters.
    // After an update or lock, keep the filters and page so the row stays in view.
    const handleSaved = (message) => {
        const created = dialog?.kind === "form" && !dialog.member;
        setDialog(null);
        reload(message);
        if (!created) return;
        setSearchInput("");
        setKeyword("");
        setRole("");
        setStatus("");
        setPage(1);
    };

    const handleUnlock = async (member) => {
        const response = await unlockStaffAccount(member.id);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        reload(response.message);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0 items-center">
                <h1 className="page-title">Tài khoản &amp; nhân sự</h1>
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                    Tạo tài khoản
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                    id="staff-search"
                    label="Tìm nhân viên"
                    placeholder="Tìm theo tên, email, SĐT"
                    value={searchInput}
                    onChange={setSearchInput}
                    className="w-full sm:w-72"
                />
                <FilterSelect
                    id="staff-role"
                    label="Vai trò"
                    options={STAFF_ROLE_OPTIONS}
                    value={role}
                    onChange={changeFilter(setRole)}
                    className="w-full sm:w-auto sm:min-w-40"
                />
                <FilterSelect
                    className="w-full sm:w-auto sm:min-w-40"
                    id="staff-status"
                    label="Trạng thái"
                    options={ACCOUNT_STATUS_OPTIONS}
                    value={status}
                    onChange={changeFilter(setStatus)}
                />
            </div>

            <div>
                <div className="table-wrap">
                    <table className="table table-stack" aria-busy={loading}>
                        <thead>
                            <tr>
                                <th scope="col">Mã NV</th>
                                <th scope="col">Nhân viên</th>
                                <th scope="col">Vai trò</th>
                                <th scope="col">Số điện thoại</th>
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
                                        onView={openView}
                                        onEdit={openEdit}
                                        onLock={openLock}
                                        onUnlock={handleUnlock}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
                {data?.totalItems > 0 && (
                    <div className="mt-4 flex justify-end">
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang danh sách nhân viên" />
                    </div>
                )}
            </div>

            {dialog?.kind === "form" && (
                <StaffFormPopup key={dialog.member?.id ?? "new"} member={dialog.member} onClose={closeDialog} onSaved={handleSaved} />
            )}
            {dialog?.kind === "detail" && <StaffDetailPopup member={dialog.member} onClose={closeDialog} onEdit={openEdit} />}
            {dialog?.kind === "lock" && <LockAccountPopup member={dialog.member} onClose={closeDialog} onSaved={handleSaved} />}
        </div>
    );
};

export default StaffManagement;
