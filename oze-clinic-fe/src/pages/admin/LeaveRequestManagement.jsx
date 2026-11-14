import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarOff } from "lucide-react";
import { toast } from "react-toastify";
import LeaveRequestDetailPopup from "@/components/popup/leaveRequest/LeaveRequestDetailPopup";
import FilterBar, { FILTER_SEARCH_CLASS, FILTER_SELECT_CLASS } from "@/components/ui/FilterBar";
import FilterSelect from "@/components/ui/FilterSelect";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import useAsync from "@/hooks/useAsync";
import { WHOLE_DAY_FILTER, approveLeaveRequest, getLeaveRequest, getLeaveRequests, rejectLeaveRequest } from "@/services/leaveRequestService";
import { SHIFT_ROLE_OPTIONS } from "@/services/shiftService";
import { LEAVE_REQUEST_STATUSES, LEAVE_REQUEST_STATUS_LABELS, LEAVE_SLOT_OPTIONS, leaveSlotLabel } from "@/utils/shift";
import { formatDate } from "@/utils/format";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 7;

const STATUS_OPTIONS = Object.values(LEAVE_REQUEST_STATUSES).map((value) => ({ value, label: LEAVE_REQUEST_STATUS_LABELS[value].label }));
const SLOT_OPTIONS = LEAVE_SLOT_OPTIONS.map((option) => ({ value: option.value ?? WHOLE_DAY_FILTER, label: option.label }));

const LeaveRequestRow = ({ request, number, onView }) => (
    <tr>
        <td data-hide-stack className="num">
            {number}
        </td>
        <td data-primary className="min-w-40">
            <p className="font-semibold text-ink">{request.senderName}</p>
            <p className="text-caption text-muted">{request.senderRole}</p>
        </td>
        <td data-label="Ngày nghỉ" className="num whitespace-nowrap">
            <p className="font-semibold text-ink">{formatDate(request.date)}</p>
            <p className="text-caption text-muted">{leaveSlotLabel(request.slot)}</p>
        </td>
        <td data-label="Lý do" data-block className="min-w-48">
            {request.reason}
        </td>
        <td data-label="Người thay" className="whitespace-nowrap">
            {request.substituteName ?? "—"}
        </td>
        <td data-label="Trạng thái">
            <StatusBadge status={request.status} labels={LEAVE_REQUEST_STATUS_LABELS} />
        </td>
        <td data-actions>
            <div className="flex items-center justify-end">
                <button type="button" className="btn btn-secondary whitespace-nowrap" onClick={() => onView(request.id)}>
                    Xem chi tiết
                </button>
            </div>
        </td>
    </tr>
);

const LeaveRequestManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [role, setRole] = useState("");
    const [slot, setSlot] = useState("");
    const [page, setPage] = useState(1);
    const [version, setVersion] = useState(0);
    const [viewing, setViewing] = useState(null);
    // The open request lives in ?id=, which is also how "Phân ca" links to a request.
    const [searchParams, setSearchParams] = useSearchParams();
    const openId = searchParams.get("id");

    const { loading, value: result } = useAsync(() => getLeaveRequests({ keyword, status, role, slot, page }), [keyword, status, role, slot, page, version]);

    useEffect(() => {
        const nextKeyword = searchInput.trim();
        if (nextKeyword === keyword) return undefined;
        const timer = setTimeout(() => {
            setKeyword(nextKeyword);
            setPage(1);
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [searchInput, keyword]);

    useEffect(() => {
        if (!openId) return undefined;
        let active = true;
        getLeaveRequest(Number(openId)).then((response) => {
            if (!active) return;
            if (response.success) {
                setViewing(response.data);
            } else {
                toast.error(response.message);
                setSearchParams({}, { replace: true });
            }
        });
        return () => {
            active = false;
        };
    }, [openId, setSearchParams]);

    const data = result?.success ? result.data : null;
    const requests = data?.items ?? [];
    const filtered = Boolean(keyword || status || role || slot);
    const firstNumber = data ? (data.page - 1) * data.pageSize + 1 : 0;

    const changeFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearchInput("");
        setKeyword("");
        setStatus("");
        setRole("");
        setSlot("");
        setPage(1);
    };

    const closeDetail = () => {
        setViewing(null);
        setSearchParams({}, { replace: true });
    };

    const handleDecision = (response) => {
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        toast.success(response.message);
        closeDetail();
        setVersion((current) => current + 1);
    };

    const handleApprove = async (substituteId) => handleDecision(await approveLeaveRequest({ id: viewing.request.id, substituteId }));

    const handleReject = async (reason) => handleDecision(await rejectLeaveRequest({ id: viewing.request.id, reason }));

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0">
                <div>
                    <h1 className="page-title">Đơn xin nghỉ</h1>
                    <p className="page-description">Nhân viên gửi đơn trước ngày nghỉ ít nhất 24 giờ</p>
                </div>
            </div>

            <FilterBar
                canClear={Boolean(filtered || searchInput)}
                onClear={clearFilters}
            >
                <SearchInput
                    id="leave-request-search"
                    label="Tìm đơn xin nghỉ"
                    placeholder="Tìm theo tên nhân viên, lý do"
                    value={searchInput}
                    onChange={setSearchInput}
                    className={FILTER_SEARCH_CLASS}
                />
                <FilterSelect
                    className={FILTER_SELECT_CLASS}
                    id="leave-request-role"
                    label="Vai trò"
                    options={SHIFT_ROLE_OPTIONS}
                    value={role}
                    onChange={changeFilter(setRole)}
                />
                <FilterSelect
                    className={FILTER_SELECT_CLASS}
                    id="leave-request-slot"
                    label="Buổi"
                    options={SLOT_OPTIONS}
                    value={slot}
                    onChange={changeFilter(setSlot)}
                />
                <FilterSelect
                    className={FILTER_SELECT_CLASS}
                    id="leave-request-status"
                    label="Trạng thái"
                    options={STATUS_OPTIONS}
                    value={status}
                    onChange={changeFilter(setStatus)}
                />
            </FilterBar>

            <div>
                <div className="table-wrap">
                    <table className="table table-stack" aria-busy={loading}>
                        <thead>
                            <tr>
                                <th scope="col">STT</th>
                                <th scope="col">Người gửi</th>
                                <th scope="col">Ngày nghỉ</th>
                                <th scope="col">Lý do</th>
                                <th scope="col">Người thay</th>
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
                            {!loading && requests.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMN_COUNT}>
                                        <div className="empty-state">
                                            <CalendarOff className="empty-state-icon" aria-hidden="true" />
                                            <p className="empty-state-title">{filtered ? "Không tìm thấy đơn phù hợp" : "Chưa có đơn xin nghỉ nào"}</p>
                                            {filtered && <p className="empty-state-text">Thử đổi từ khóa hoặc bộ lọc.</p>}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                requests.map((request, index) => (
                                    <LeaveRequestRow
                                        key={request.id}
                                        request={request}
                                        number={firstNumber + index}
                                        onView={(id) => setSearchParams({ id: String(id) }, { replace: true })}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
                {data?.totalItems > 0 && (
                    <div className="mt-4 flex justify-end">
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang đơn xin nghỉ" />
                    </div>
                )}
            </div>

            {viewing && viewing.request.id === Number(openId) && (
                <LeaveRequestDetailPopup
                    key={viewing.request.id}
                    request={viewing.request}
                    substituteOptions={viewing.substituteOptions}
                    onClose={closeDetail}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </div>
    );
};

export default LeaveRequestManagement;
