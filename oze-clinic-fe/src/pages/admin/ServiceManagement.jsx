import { useEffect, useState } from "react";
import { ChevronRight, Pencil, Plus, Search, Stethoscope } from "lucide-react";
import { toast } from "react-toastify";
import Pagination from "@/components/ui/Pagination";
import Toggle from "@/components/ui/Toggle";
import useAsync from "@/hooks/useAsync";
import { getServices, setServiceActive } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { SERVICE_GROUPS } from "@/utils/data/mockServicesAdmin";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 7;

const GROUP_OPTIONS = [
    { value: SERVICE_GROUPS.EXAMINATION, label: "Khám" },
    { value: SERVICE_GROUPS.ORTHODONTICS, label: "Chỉnh nha" },
    { value: SERVICE_GROUPS.PROSTHODONTICS, label: "Phục hình" },
    { value: SERVICE_GROUPS.PERIODONTICS, label: "Nha chu" },
    { value: SERVICE_GROUPS.SURGERY, label: "Phẫu thuật" },
    { value: SERVICE_GROUPS.COSMETIC, label: "Thẩm mỹ" },
    { value: SERVICE_GROUPS.IMAGING, label: "Hình ảnh" },
];

const STATUS_OPTIONS = [
    { value: "active", label: "Đang hoạt động" },
    { value: "inactive", label: "Ngừng hoạt động" },
];

const priceFormatter = new Intl.NumberFormat("vi-VN");

const groupLabel = (group) => GROUP_OPTIONS.find((option) => option.value === group)?.label ?? group;

const PriceCell = ({ service }) => {
    if (service.price === 0) return <span className="font-semibold text-success">Miễn phí</span>;
    return (
        <span className="font-semibold text-ink">
            {service.priceFrom && "Từ "}
            {priceFormatter.format(service.price)} ₫
        </span>
    );
};

const ServiceRow = ({ service, onOpen, onEdit, onToggleActive }) => {
    const dimmed = !service.isActive;

    return (
        <tr className="cursor-pointer" onClick={() => onOpen(service)}>
            <td className={cx("cell-primary whitespace-nowrap", dimmed && "opacity-60")}>{service.code}</td>
            <td className={cx("min-w-56", dimmed && "opacity-60")}>
                <p className="text-label text-ink">{service.name}</p>
                <p className="text-caption text-muted">{service.description}</p>
            </td>
            <td className={cx("whitespace-nowrap", dimmed && "opacity-60")}>{groupLabel(service.group)}</td>
            <td className={cx("whitespace-nowrap text-right", dimmed && "opacity-60")}>
                <PriceCell service={service} />
            </td>
            <td>
                <span className={cx("badge", service.isActive ? "badge-success" : "badge-neutral")}>
                    {service.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                </span>
            </td>
            <td>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="btn btn-icon size-8 hover:bg-surface-tint"
                        aria-label={`Chỉnh sửa ${service.code}`}
                        title="Chỉnh sửa"
                        onClick={(event) => {
                            event.stopPropagation();
                            onEdit(service);
                        }}
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <Toggle
                        key={`${service.id}-${service.isActive}`}
                        checked={service.isActive}
                        label={service.isActive ? `Ngừng hoạt động ${service.code}` : `Kích hoạt ${service.code}`}
                        onChange={(next) => onToggleActive(service, next)}
                    />
                </div>
            </td>
            <td className="w-10 pr-2">
                <button
                    type="button"
                    className="btn btn-icon size-8 text-muted hover:bg-surface-tint hover:text-ink"
                    aria-label={`Xem chi tiết ${service.name}`}
                    title="Xem chi tiết"
                    onClick={(event) => {
                        event.stopPropagation();
                        onOpen(service);
                    }}
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </td>
        </tr>
    );
};

const ServiceManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [group, setGroup] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);

    const { loading, value: result } = useAsync(
        () => getServices({ keyword, group, status, page }),
        [keyword, group, status, page, reloadKey],
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
    const services = data?.items ?? [];
    const filtered = Boolean(keyword || group || status);
    const firstItem = data ? (data.page - 1) * data.pageSize + 1 : 0;
    const lastItem = firstItem + services.length - 1;

    const changeFilter = (setter) => (event) => {
        setter(event.target.value);
        setPage(1);
    };

    // TODO: open the popups (add / edit / service types) once their designs are ready.
    const openCreate = () => {};
    const openEdit = () => {};
    const openDetail = () => {};

    // Returns false when the change failed, so the Toggle flips back.
    const handleToggleActive = async (service, isActive) => {
        const response = await setServiceActive(service.id, isActive);
        if (!response.success) {
            toast.error(response.message);
            return false;
        }
        toast.success(response.message);
        setReloadKey((current) => current + 1);
        return true;
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Dịch vụ</h1>
                    <p className="page-description">Bấm vào một dịch vụ để xem và quản lý các loại của dịch vụ đó.</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                    <Plus className="size-4" aria-hidden="true" />
                    Thêm dịch vụ
                </button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <div className="field w-full sm:w-72">
                    <label htmlFor="service-search" className="label">
                        Tìm kiếm
                    </label>
                    <div className="search">
                        <Search aria-hidden="true" />
                        <input
                            id="service-search"
                            type="search"
                            className="input"
                            placeholder="Nhập tên hoặc mã dịch vụ"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                        />
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="service-group" className="label">
                        Nhóm dịch vụ
                    </label>
                    <select id="service-group" className="input w-auto min-w-40" value={group} onChange={changeFilter(setGroup)}>
                        <option value="">Tất cả nhóm</option>
                        {GROUP_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="service-status" className="label">
                        Trạng thái
                    </label>
                    <select id="service-status" className="input w-auto min-w-40" value={status} onChange={changeFilter(setStatus)}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                {data && (
                    <p className="num ml-auto pb-2.5 text-caption text-muted" aria-live="polite">
                        {data.totalItems} dịch vụ
                    </p>
                )}
            </div>

            <div>
                <div className="table-wrap">
                    <table className="table" aria-busy={loading}>
                        <thead>
                            <tr>
                                <th scope="col">Mã</th>
                                <th scope="col">Tên dịch vụ</th>
                                <th scope="col">Nhóm</th>
                                <th scope="col" className="text-right">
                                    Giá tham khảo
                                </th>
                                <th scope="col">Trạng thái</th>
                                <th scope="col">Thao tác</th>
                                <th scope="col">
                                    <span className="sr-only">Chi tiết</span>
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
                            {!loading && services.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMN_COUNT}>
                                        <div className="empty-state">
                                            <Stethoscope className="empty-state-icon" aria-hidden="true" />
                                            <p className="empty-state-title">
                                                {filtered ? "Không tìm thấy dịch vụ phù hợp" : "Chưa có dịch vụ nào"}
                                            </p>
                                            <p className="empty-state-text">
                                                {filtered ? "Thử đổi từ khóa hoặc bộ lọc." : "Bấm “Thêm dịch vụ” để tạo dịch vụ đầu tiên."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                services.map((service) => (
                                    <ServiceRow
                                        key={service.id}
                                        service={service}
                                        onOpen={openDetail}
                                        onEdit={openEdit}
                                        onToggleActive={handleToggleActive}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
                {data && data.totalItems > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="num text-caption text-muted">
                            Hiển thị {firstItem}–{lastItem} trong {data.totalItems} bản ghi
                        </p>
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang danh sách dịch vụ" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceManagement;
