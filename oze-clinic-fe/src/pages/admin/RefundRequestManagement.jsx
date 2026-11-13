import { useEffect, useState } from "react";
import StatusTabs from "@/components/ui/StatusTabs";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import RefundRequestDetailPopup from "@/components/popup/refund/RefundRequestDetailPopup";
import RefundRequestTable from "@/components/refund/RefundRequestTable";
import FilterSelect from "@/components/ui/FilterSelect";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import useAsync from "@/hooks/useAsync";
import { confirmRefundRequest, getRefundDoctorOptions, getRefundRequest, getRefundRequests, rejectRefundRequest } from "@/services/refundRequestService";
import { REFUND_REQUEST_STATUSES, REFUND_REQUEST_STATUS_LABELS } from "@/utils/data/mockRefundRequests";

const SEARCH_DELAY_MS = 300;

const STATUS_OPTIONS = Object.values(REFUND_REQUEST_STATUSES).map((value) => ({ value, label: REFUND_REQUEST_STATUS_LABELS[value].label }));

const RefundRequestManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [doctorId, setDoctorId] = useState("");
    const [page, setPage] = useState(1);
    const [version, setVersion] = useState(0);
    const [viewing, setViewing] = useState(null);
    // The open request lives in ?id=, which is also how the dashboard links to a request.
    const [searchParams, setSearchParams] = useSearchParams();
    const openId = searchParams.get("id");

    const { loading, value: result } = useAsync(() => getRefundRequests({ keyword, status, doctorId, page }), [keyword, status, doctorId, page, version]);

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
        getRefundRequest(Number(openId)).then((response) => {
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
    const firstNumber = data ? (data.page - 1) * data.pageSize + 1 : 0;

    const changeFilter = (setter) => (value) => {
        setter(value);
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

    const handleConfirm = async () => handleDecision(await confirmRefundRequest(viewing.id));

    const handleReject = async (reason) => handleDecision(await rejectRefundRequest({ id: viewing.id, reason }));

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0">
                <div>
                    <h1 className="page-title">Duyệt hoàn tiền</h1>
                    <p className="page-description">Quyết định sau khi quản lý, bệnh nhân và bác sĩ đã trao đổi, xác minh</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                    id="refund-request-search"
                    label="Tìm yêu cầu hoàn tiền"
                    placeholder="Tìm theo bệnh nhân, mã bệnh nhân, hoá đơn"
                    value={searchInput}
                    onChange={setSearchInput}
                    className="w-full sm:w-96"
                />
                <StatusTabs className="w-full" label="Trạng thái" options={STATUS_OPTIONS} value={status} onChange={changeFilter(setStatus)} />
                <FilterSelect
                    className="w-full sm:w-auto sm:min-w-40"
                    id="refund-request-doctor"
                    label="Bác sĩ phụ trách"
                    options={getRefundDoctorOptions()}
                    value={doctorId}
                    onChange={changeFilter(setDoctorId)}
                />
            </div>

            <div>
                <RefundRequestTable
                    requests={requests}
                    firstNumber={firstNumber}
                    loading={loading}
                    filtered={Boolean(keyword || status || doctorId)}
                    onView={(id) => setSearchParams({ id: String(id) }, { replace: true })}
                />
                {data?.totalItems > 0 && (
                    <div className="mt-4 flex justify-end">
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang yêu cầu hoàn tiền" />
                    </div>
                )}
            </div>

            {viewing && viewing.id === Number(openId) && (
                <RefundRequestDetailPopup key={viewing.id} request={viewing} onClose={closeDetail} onConfirm={handleConfirm} onReject={handleReject} />
            )}
        </div>
    );
};

export default RefundRequestManagement;
