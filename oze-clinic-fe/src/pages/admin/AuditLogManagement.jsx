import { useEffect, useState } from "react";
import { ChevronRight, History } from "lucide-react";
import { toast } from "react-toastify";
import AuditLogDetailPopup from "@/components/popup/auditLog/AuditLogDetailPopup";
import Badge from "@/components/ui/Badge";
import FilterSelect from "@/components/ui/FilterSelect";
import Pagination from "@/components/ui/Pagination";
import PersonCell from "@/components/ui/PersonCell";
import SearchInput from "@/components/ui/SearchInput";
import useAsync from "@/hooks/useAsync";
import { getAllAuditLogs, getAuditLogs } from "@/services/auditLogService";
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS } from "@/utils/data/mockAuditLogs";
import { getClinicDateTimeParts, getClinicToday } from "@/utils/format";
import { downloadExcel } from "@/utils/reportExport";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 8;

const entityLabel = (entityType) => AUDIT_ENTITY_OPTIONS.find((option) => option.value === entityType)?.label ?? entityType;

const EXPORT_HEADER = ["Mã", "Người dùng", "Vai trò", "Hành động", "Đối tượng", "Mã đối tượng", "Địa chỉ IP", "Trình duyệt / thiết bị", "Thời gian"];

const toExportRow = (log) => {
    const { date, time } = getClinicDateTimeParts(log.createdAt);
    return [
        log.id,
        log.userName,
        log.userRole,
        AUDIT_ACTION_LABELS[log.action].label,
        entityLabel(log.entityType),
        log.entityId,
        log.ipAddress,
        log.userAgent,
        `${date} ${time}`,
    ];
};

const AuditLogRow = ({ log, onView }) => {
    const { label, variant } = AUDIT_ACTION_LABELS[log.action];
    const { date, time } = getClinicDateTimeParts(log.createdAt);

    return (
        <tr>
            <td className="cell-primary num whitespace-nowrap">#{log.id}</td>
            <td className="min-w-44">
                <PersonCell name={log.userName} detail={log.userRole} />
            </td>
            <td>
                <Badge variant={variant}>{label}</Badge>
            </td>
            <td className="whitespace-nowrap">{entityLabel(log.entityType)}</td>
            <td className="num whitespace-nowrap">{log.ipAddress}</td>
            <td className="whitespace-nowrap text-muted">{log.userAgent}</td>
            <td className="num whitespace-nowrap">
                <span className="block text-caption text-muted">{date}</span>
                <span className="font-medium text-ink">{time}</span>
            </td>
            <td>
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        className="btn btn-secondary btn-icon size-8"
                        aria-label={`Xem nhật ký #${log.id}`}
                        title="Xem chi tiết"
                        onClick={() => onView(log)}
                    >
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

const AuditLogManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState(null);
    const [exporting, setExporting] = useState(false);

    const { loading, value: result } = useAsync(
        () => getAuditLogs({ keyword, from, to, action, entityType, page }),
        [keyword, from, to, action, entityType, page],
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
    const logs = data?.items ?? [];
    const filtered = Boolean(keyword || from || to || action || entityType);

    const changeFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const handleExport = async () => {
        setExporting(true);
        const response = await getAllAuditLogs({ keyword, from, to, action, entityType });
        setExporting(false);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        downloadExcel([EXPORT_HEADER, ...response.data.map(toExportRow)], `nhat-ky-he-thong-${getClinicToday()}.xlsx`, "Nhật ký hệ thống");
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Nhật ký hệ thống</h1>
                    <p className="page-description">Lịch sử tạo, sửa, xoá dữ liệu trong hệ thống · chỉ đọc</p>
                </div>
                <button type="button" className="btn btn-secondary" disabled={exporting || !data?.totalItems} onClick={handleExport}>
                    {exporting ? "Đang xuất..." : "Xuất Excel"}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                    id="audit-log-search"
                    label="Tìm nhật ký"
                    placeholder="Tìm theo người dùng hoặc IP"
                    value={searchInput}
                    onChange={setSearchInput}
                    className="w-full sm:w-72 lg:flex-1"
                />
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className="input w-auto"
                        aria-label="Từ ngày"
                        max={to || undefined}
                        value={from}
                        onChange={(event) => changeFilter(setFrom)(event.target.value)}
                    />
                    <span className="text-muted" aria-hidden="true">
                        –
                    </span>
                    <input
                        type="date"
                        className="input w-auto"
                        aria-label="Đến ngày"
                        min={from || undefined}
                        value={to}
                        onChange={(event) => changeFilter(setTo)(event.target.value)}
                    />
                </div>
                <FilterSelect id="audit-log-action" label="Hành động" options={AUDIT_ACTION_OPTIONS} value={action} onChange={changeFilter(setAction)} />
                <FilterSelect
                    id="audit-log-entity"
                    label="Đối tượng"
                    options={AUDIT_ENTITY_OPTIONS}
                    value={entityType}
                    onChange={changeFilter(setEntityType)}
                />
            </div>

            <div>
                <div className="table-wrap">
                    <table className="table" aria-busy={loading}>
                        <thead>
                            <tr>
                                <th scope="col">Mã</th>
                                <th scope="col">Người dùng</th>
                                <th scope="col">Hành động</th>
                                <th scope="col">Đối tượng</th>
                                <th scope="col">Địa chỉ IP</th>
                                <th scope="col">Trình duyệt / thiết bị</th>
                                <th scope="col">Thời gian</th>
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
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMN_COUNT}>
                                        <div className="empty-state">
                                            <History className="empty-state-icon" aria-hidden="true" />
                                            <p className="empty-state-title">{filtered ? "Không tìm thấy nhật ký phù hợp" : "Chưa có nhật ký nào"}</p>
                                            {filtered && <p className="empty-state-text">Thử đổi từ khóa hoặc bộ lọc.</p>}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.map((log) => <AuditLogRow key={log.id} log={log} onView={setViewing} />)}
                        </tbody>
                    </table>
                </div>
                {data?.totalItems > 0 && (
                    <div className="mt-4 flex justify-end">
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang nhật ký hệ thống" />
                    </div>
                )}
            </div>

            {viewing && <AuditLogDetailPopup log={viewing} onClose={() => setViewing(null)} />}
        </div>
    );
};

export default AuditLogManagement;
