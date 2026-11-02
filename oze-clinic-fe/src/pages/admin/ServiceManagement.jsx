import { useEffect, useState } from "react";
import { Pencil, Stethoscope } from "lucide-react";
import { toast } from "react-toastify";
import DeactivateServicePopup from "@/components/popup/service/DeactivateServicePopup";
import ServiceFormPopup from "@/components/popup/service/ServiceFormPopup";
import ServiceTypesPopup from "@/components/popup/service/ServiceTypesPopup";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import TablePagination from "@/components/ui/TablePagination";
import Toggle from "@/components/ui/Toggle";
import useAsync from "@/hooks/useAsync";
import { activateService, getServices } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { ROOM_TYPE_OPTIONS, roomTypeLabel } from "@/utils/data/mockRooms";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 8;

const priceFormatter = new Intl.NumberFormat("vi-VN");

// "2026-10-20" -> "20/10/2026"
const formatDate = (value) => value.split("-").reverse().join("/");

const PriceCell = ({ service }) => {
    if (service.price === 0) return <span className="font-bold text-ink">Miễn phí</span>;
    return (
        <span className="font-bold text-ink">
            {service.priceFrom && "Từ "}
            {priceFormatter.format(service.price)} ₫
        </span>
    );
};

const ServiceRow = ({ service, index, selected, onOpen, onEdit, onToggleActive }) => {
    const dimmed = !service.isActive;

    return (
        <tr
            className={cx("cursor-pointer", selected && "shadow-[inset_3px_0_0_var(--color-primary)]")}
            aria-selected={selected}
            onClick={() => onOpen(service)}
        >
            <td className={cx("num", dimmed && "opacity-60")}>{index}</td>
            <td className={cx("num whitespace-nowrap", dimmed && "opacity-60")}>{service.code}</td>
            <td className={cx("min-w-56", dimmed && "opacity-60")}>
                <p className="font-semibold text-ink">{service.name}</p>
                <p className="text-caption font-normal text-muted">
                    {service.description}
                    {service.typeCount > 0 && ` · ${service.typeCount} loại`}
                </p>
            </td>
            <td className={cx("whitespace-nowrap", dimmed && "opacity-60")}>{roomTypeLabel(service.roomType) || "—"}</td>
            <td className={cx("num whitespace-nowrap text-right", dimmed && "opacity-60")}>
                <PriceCell service={service} />
            </td>
            <td className={cx("num whitespace-nowrap", dimmed && "opacity-60")}>
                {service.durationMinutes ? `${service.durationMinutes} phút` : "—"}
            </td>
            <td>
                {service.isActive && service.deactivateFrom ? (
                    <span className="badge badge-warning num" title={service.deactivateReason ?? undefined}>
                        Ngừng từ {formatDate(service.deactivateFrom)}
                    </span>
                ) : (
                    <span className={cx("badge", service.isActive ? "badge-success" : "badge-neutral")}>
                        {service.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                )}
            </td>
            <td>
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        className="btn btn-secondary btn-icon size-8"
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
        </tr>
    );
};

const ServiceManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [roomType, setRoomType] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    // null = closed; { service: null } = add; { service } = update.
    const [editor, setEditor] = useState(null);
    const [deactivating, setDeactivating] = useState(null);
    // Service whose types are shown in the types popup.
    const [viewing, setViewing] = useState(null);

    const { loading, value: result } = useAsync(
        () => getServices({ keyword, roomType, page }),
        [keyword, roomType, page, reloadKey],
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
    const filtered = Boolean(keyword || roomType);
    const firstItem = data ? (data.page - 1) * data.pageSize + 1 : 0;

    const openCreate = () => setEditor({ service: null });
    const openEdit = (service) => setEditor({ service });

    // A new service goes to the top of the list, so show page 1 without filters.
    // After an update, keep the filters and page so the edited row stays in view.
    const handleSaved = (message) => {
        const created = !editor?.service;
        setEditor(null);
        toast.success(message);
        setReloadKey((current) => current + 1);
        if (!created) return;
        setSearchInput("");
        setKeyword("");
        setRoomType("");
        setPage(1);
    };

    const openDetail = (service) => setViewing(service);

    // Turning off asks for the date and reason first, so the Toggle stays on (return false) until the popup is saved.
    // Turning on happens straight away; false when it failed, so the Toggle flips back.
    const handleToggleActive = async (service, isActive) => {
        if (!isActive) {
            setDeactivating(service);
            return false;
        }
        const response = await activateService(service.id);
        if (!response.success) {
            toast.error(response.message);
            return false;
        }
        toast.success(response.message);
        setReloadKey((current) => current + 1);
        return true;
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Dịch vụ</h1>
                    <p className="page-description num" aria-live="polite">
                        {data ? `${data.totalItems} dịch vụ · bấm một dòng để xem các loại` : "\u00a0"}
                    </p>
                </div>
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                    Thêm dịch vụ
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                    id="service-search"
                    label="Tìm kiếm dịch vụ"
                    placeholder="Tìm theo mã, tên dịch vụ"
                    value={searchInput}
                    onChange={setSearchInput}
                    className="w-full sm:w-72"
                />
                <FilterSelect
                    id="service-room-type"
                    label="Loại phòng"
                    options={ROOM_TYPE_OPTIONS}
                    value={roomType}
                    onChange={(value) => {
                        setRoomType(value);
                        setPage(1);
                    }}
                />
            </div>

            <div>
                <div className="table-wrap">
                    <table className="table" aria-busy={loading}>
                        <thead>
                            <tr>
                                <th scope="col">STT</th>
                                <th scope="col">Mã</th>
                                <th scope="col">Tên dịch vụ</th>
                                <th scope="col">Loại phòng yêu cầu</th>
                                <th scope="col" className="text-right">
                                    Giá tham khảo
                                </th>
                                <th scope="col">Thời lượng</th>
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
                                services.map((service, index) => (
                                    <ServiceRow
                                        key={service.id}
                                        index={firstItem + index}
                                        service={service}
                                        selected={viewing?.id === service.id}
                                        onOpen={openDetail}
                                        onEdit={openEdit}
                                        onToggleActive={handleToggleActive}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
                <TablePagination data={data} itemCount={services.length} onChange={setPage} label="Phân trang danh sách dịch vụ" />
            </div>

            {editor && (
                <ServiceFormPopup
                    key={editor.service?.id ?? "new"}
                    service={editor.service}
                    onClose={() => setEditor(null)}
                    onSaved={handleSaved}
                />
            )}
            {viewing && (
                <ServiceTypesPopup
                    key={viewing.id}
                    service={viewing}
                    onClose={() => setViewing(null)}
                    onChanged={() => setReloadKey((current) => current + 1)}
                />
            )}
            {deactivating && (
                <DeactivateServicePopup
                    key={deactivating.id}
                    service={deactivating}
                    onClose={() => setDeactivating(null)}
                    onSaved={(message) => {
                        setDeactivating(null);
                        toast.success(message);
                        setReloadKey((current) => current + 1);
                    }}
                />
            )}
        </div>
    );
};

export default ServiceManagement;
