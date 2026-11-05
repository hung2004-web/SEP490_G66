import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DebtAgeLegend from "@/components/debt/DebtAgeLegend";
import DebtTable from "@/components/debt/DebtTable";
import DebtDetailPopup from "@/components/popup/debt/DebtDetailPopup";
import FilterSelect from "@/components/ui/FilterSelect";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import useAsync from "@/hooks/useAsync";
import { getAllDebts, getDebt, getDebts } from "@/services/debtService";
import { DEBT_AGE_FILTER_LABELS, DEBT_SORTS, DEBT_SORT_LABELS, DEBT_SOURCE_LABELS, DEBT_STATUS_LABELS } from "@/utils/data/mockDebts";
import { formatDate, formatDateTime, getClinicToday } from "@/utils/format";
import { downloadExcel } from "@/utils/reportExport";

const SEARCH_DELAY_MS = 300;

// Fills its grid cell, so the four filters stay the same width. Less padding than .input, so "Sắp xếp: Nợ lâu nhất" fits at 1366px.
const FILTER_CLASS = "w-full min-w-0 pl-3 pr-2";

const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS = Object.entries(DEBT_STATUS_LABELS).map(([value, { label }]) => ({ value, label }));
const AGE_OPTIONS = toOptions(DEBT_AGE_FILTER_LABELS);
const SOURCE_OPTIONS = toOptions(DEBT_SOURCE_LABELS);
const SORT_OPTIONS = [DEBT_SORTS.NEWEST, DEBT_SORTS.LARGEST].map((value) => ({ value, label: DEBT_SORT_LABELS[value] }));

const SORT_DESCRIPTIONS = {
    [DEBT_SORTS.OLDEST]: "ngày tạo cũ nhất",
    [DEBT_SORTS.NEWEST]: "ngày tạo mới nhất",
    [DEBT_SORTS.LARGEST]: "số tiền còn nợ nhiều nhất",
};

const EXPORT_HEADER = ["Bệnh nhân", "Số điện thoại", "Hoá đơn", "Ngày tạo", "Nguồn", "Phải trả", "Đã trả", "Còn nợ", "Trạng thái"];

const toExportRow = (debt) => [
    debt.patientName,
    debt.phone,
    debt.invoiceNumber,
    formatDate(debt.createdAt),
    DEBT_SOURCE_LABELS[debt.source],
    debt.totalAmount,
    debt.paidAmount,
    debt.remainingAmount,
    DEBT_STATUS_LABELS[debt.status].label,
];

const DebtManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [age, setAge] = useState("");
    const [source, setSource] = useState("");
    const [sort, setSort] = useState(DEBT_SORTS.OLDEST);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [viewing, setViewing] = useState(null);
    // The open invoice lives in ?id=, so a debt can be linked to directly.
    const [searchParams, setSearchParams] = useSearchParams();
    const openId = searchParams.get("id");

    const { loading, value: result } = useAsync(() => getDebts({ keyword, status, age, source, sort, page }), [keyword, status, age, source, sort, page]);

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
        getDebt(Number(openId)).then((response) => {
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
    const debts = data?.items ?? [];
    const firstNumber = data ? (data.page - 1) * data.pageSize + 1 : 0;

    const changeFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const closeDetail = () => {
        setViewing(null);
        setSearchParams({}, { replace: true });
    };

    const handleExport = async () => {
        setExporting(true);
        const response = await getAllDebts({ keyword, status, age, source, sort });
        setExporting(false);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        downloadExcel([EXPORT_HEADER, ...response.data.map(toExportRow)], `cong-no-${getClinicToday()}.xlsx`, "Công nợ");
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Công nợ</h1>
                    <p className="page-description">
                        Hoá đơn còn nợ (Phải trả − Đã trả &gt; 0)
                        {data && ` · cập nhật ${formatDateTime(data.updatedAt)}`}
                    </p>
                </div>
                <button type="button" className="btn btn-secondary" disabled={exporting || !data?.totalItems} onClick={handleExport}>
                    {exporting ? "Đang xuất..." : "Xuất danh sách"}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
                <SearchInput
                    id="debt-search"
                    label="Tìm hoá đơn còn nợ"
                    placeholder="Tìm theo tên, SĐT hoặc số hoá đơn"
                    value={searchInput}
                    onChange={setSearchInput}
                    className="col-span-full w-full xl:col-span-1"
                />
                <FilterSelect id="debt-status" label="Trạng thái" options={STATUS_OPTIONS} value={status} onChange={changeFilter(setStatus)} className={FILTER_CLASS} />
                <FilterSelect id="debt-age" label="Thời gian nợ" options={AGE_OPTIONS} value={age} onChange={changeFilter(setAge)} className={FILTER_CLASS} />
                <FilterSelect id="debt-source" label="Nguồn" options={SOURCE_OPTIONS} value={source} onChange={changeFilter(setSource)} className={FILTER_CLASS} />
                <FilterSelect
                    id="debt-sort"
                    label="Sắp xếp"
                    allLabel={DEBT_SORT_LABELS[DEBT_SORTS.OLDEST]}
                    options={SORT_OPTIONS}
                    value={sort}
                    onChange={changeFilter(setSort)}
                    className={FILTER_CLASS}
                />
            </div>

            <div className="flex flex-col gap-3">
                <DebtAgeLegend />
                <DebtTable
                    debts={debts}
                    firstNumber={firstNumber}
                    loading={loading}
                    filtered={Boolean(keyword || status || age || source)}
                    onView={(id) => setSearchParams({ id: String(id) }, { replace: true })}
                    footer={
                        data?.totalItems > 0 && (
                            <>
                                <span className="num">
                                    Hiển thị {firstNumber}–{firstNumber + debts.length - 1} / {data.totalItems} hoá đơn · sắp xếp theo {SORT_DESCRIPTIONS[sort]}
                                </span>
                                <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang công nợ" />
                            </>
                        )
                    }
                />
            </div>

            {viewing && viewing.id === Number(openId) && <DebtDetailPopup key={viewing.id} debt={viewing} onClose={closeDetail} />}
        </div>
    );
};

export default DebtManagement;
