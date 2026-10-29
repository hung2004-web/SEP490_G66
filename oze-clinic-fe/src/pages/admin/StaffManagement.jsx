import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import LockAccountPopup from "@/components/popup/LockAccountPopup";
import StaffTable from "@/components/staff/StaffTable";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import TablePagination from "@/components/ui/TablePagination";
import useAsync from "@/hooks/useAsync";
import { getStaffAccounts, unlockStaffAccount } from "@/services/staffService";
import { ACCOUNT_STATUS_OPTIONS, STAFF_ROLE_OPTIONS } from "@/utils/data/mockStaff";

const SEARCH_DELAY_MS = 300;

const StaffManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [locking, setLocking] = useState(null);

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

    const changeFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const reload = (message) => {
        toast.success(message);
        setReloadKey((current) => current + 1);
    };

    // TODO(design): create / view / edit account popups are not designed yet.
    const openCreate = () => {};
    const openView = () => {};
    const openEdit = () => {};

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
                <FilterSelect id="staff-role" label="Vai trò" options={STAFF_ROLE_OPTIONS} value={role} onChange={changeFilter(setRole)} />
                <FilterSelect
                    id="staff-status"
                    label="Trạng thái"
                    options={ACCOUNT_STATUS_OPTIONS}
                    value={status}
                    onChange={changeFilter(setStatus)}
                />
            </div>

            <div>
                <StaffTable
                    staff={staff}
                    loading={loading}
                    filtered={Boolean(keyword || role || status)}
                    onView={openView}
                    onEdit={openEdit}
                    onLock={setLocking}
                    onUnlock={handleUnlock}
                />
                <TablePagination data={data} itemCount={staff.length} onChange={setPage} label="Phân trang danh sách nhân viên" />
            </div>

            {locking && (
                <LockAccountPopup
                    key={locking.id}
                    member={locking}
                    onClose={() => setLocking(null)}
                    onSaved={(message) => {
                        setLocking(null);
                        reload(message);
                    }}
                />
            )}
        </div>
    );
};

export default StaffManagement;
