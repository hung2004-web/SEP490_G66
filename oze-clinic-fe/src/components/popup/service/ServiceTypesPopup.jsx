import { useRef, useState } from "react";
import { Layers, Pencil } from "lucide-react";
import { toast } from "react-toastify";
import DeactivateServicePopup from "@/components/popup/service/DeactivateServicePopup";
import ServiceTypeFormPopup from "@/components/popup/service/ServiceTypeFormPopup";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import useAsync from "@/hooks/useAsync";
import { activateServiceType, getServiceTypes } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { roomTypeLabel } from "@/utils/data/mockRooms";

const SKELETON_ROW_COUNT = 3;
const COLUMN_COUNT = 6;

const priceFormatter = new Intl.NumberFormat("vi-VN");

// "2026-10-20" -> "20/10/2026"
const formatDate = (value) => value.split("-").reverse().join("/");

// Price of the service: the cheapest active type ("Từ ..."), or its own price when it has none.
const servicePrice = (service, activeTypes) => {
    if (activeTypes.length > 0) return `Từ ${priceFormatter.format(Math.min(...activeTypes.map((type) => type.price)))} ₫`;
    if (service.price === 0) return "Miễn phí";
    return `${service.priceFrom ? "Từ " : ""}${priceFormatter.format(service.price)} ₫`;
};

// A scheduled stop shows its date (reason on hover).
const StatusBadge = ({ type }) => {
    if (type.isActive && type.deactivateFrom) {
        return (
            <span className="badge badge-warning num whitespace-nowrap" title={type.deactivateReason ?? undefined}>
                Ngừng từ {formatDate(type.deactivateFrom)}
            </span>
        );
    }
    return (
        <span className={cx("badge whitespace-nowrap", type.isActive ? "badge-success" : "badge-neutral")}>
            {type.isActive ? "Đang hoạt động" : "Ngưng hoạt động"}
        </span>
    );
};

const SummaryItem = ({ label, children }) => (
    <div className="grid grid-cols-[9rem_1fr] gap-3">
        <dt className="text-muted">{label}</dt>
        <dd className="num font-semibold text-ink">{children}</dd>
    </div>
);

// "Loại dịch vụ" popup opened from a row of the service list.
// onChanged runs after a type is added, updated or switched, so the list can refresh its price and type count.
const ServiceTypesPopup = ({ service, onClose, onChanged }) => {
    const closeRef = useRef(null);
    const [reloadKey, setReloadKey] = useState(0);
    // null = closed; { type: null } = add; { type } = update.
    const [editor, setEditor] = useState(null);
    const [deactivating, setDeactivating] = useState(null);

    const { loading, value: result } = useAsync(() => getServiceTypes(service.id), [service.id, reloadKey]);
    const types = result?.success ? result.data : [];
    const activeTypes = types.filter((type) => type.isActive);

    const reload = (message) => {
        toast.success(message);
        setReloadKey((current) => current + 1);
        onChanged?.();
    };

    // Same as the service list: turning off asks for the date and reason first, so the Toggle stays on until saved.
    const handleToggleActive = async (type, isActive) => {
        if (!isActive) {
            setDeactivating(type);
            return false;
        }
        const response = await activateServiceType(type.id);
        if (!response.success) {
            toast.error(response.message);
            return false;
        }
        reload(response.message);
        return true;
    };

    return (
        <Modal
            title={`Loại dịch vụ · ${service.name}`}
            description={[roomTypeLabel(service.roomType), "giá dịch vụ lấy theo loại rẻ nhất đang hoạt động"].filter(Boolean).join(" · ")}
            size="lg"
            onClose={onClose}
            initialFocusRef={closeRef}
        >
            <dl className="mt-5 flex flex-col gap-2 rounded-lg bg-surface-tint px-4 py-3">
                <SummaryItem label="Giá tham khảo">{loading ? "…" : servicePrice(service, activeTypes)}</SummaryItem>
                <SummaryItem label="Số loại">
                    {loading ? "…" : `${types.length} loại · ${activeTypes.length} đang hoạt động`}
                </SummaryItem>
            </dl>

            <div className="mb-3 mt-6 flex items-center justify-between gap-3">
                <h3 className="text-title text-ink">Danh sách loại</h3>
                <button type="button" className="btn btn-primary" onClick={() => setEditor({ type: null })}>
                    Thêm loại
                </button>
            </div>

            <div className="table-wrap">
                <table className="table" aria-busy={loading}>
                    <thead>
                        <tr>
                            <th scope="col">TT</th>
                            <th scope="col">Tên loại dịch vụ</th>
                            <th scope="col" className="text-right">
                                Giá tham khảo
                            </th>
                            <th scope="col">Thời gian dự kiến</th>
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
                                            <div className="skeleton h-4 w-full max-w-24" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        {!loading && types.length === 0 && (
                            <tr>
                                <td colSpan={COLUMN_COUNT}>
                                    <div className="empty-state">
                                        <Layers className="empty-state-icon" aria-hidden="true" />
                                        <p className="empty-state-title">Chưa có loại dịch vụ nào</p>
                                        <p className="empty-state-text">Bấm “Thêm loại” để tạo loại đầu tiên.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            types.map((type, index) => (
                                <tr key={type.id}>
                                    <td className="num">{index + 1}</td>
                                    <td className="font-semibold text-ink">{type.name}</td>
                                    <td className="num whitespace-nowrap text-right text-ink">{priceFormatter.format(type.price)} ₫</td>
                                    <td className="num whitespace-nowrap">{type.durationMinutes ? `${type.durationMinutes} phút` : "—"}</td>
                                    <td>
                                        <StatusBadge type={type} />
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-icon size-8"
                                                aria-label={`Sửa ${type.name}`}
                                                title="Sửa"
                                                onClick={() => setEditor({ type })}
                                            >
                                                <Pencil className="size-4" aria-hidden="true" />
                                            </button>
                                            <Toggle
                                                key={`${type.id}-${type.isActive}`}
                                                checked={type.isActive}
                                                label={type.isActive ? `Ngừng hoạt động ${type.name}` : `Kích hoạt ${type.name}`}
                                                onChange={(next) => handleToggleActive(type, next)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-3 text-caption font-normal text-muted">
                Tắt một loại thì bệnh nhân không chọn được loại đó khi đặt lịch. Lịch đã đặt giữ nguyên.
            </p>

            <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
                <button ref={closeRef} type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
            </div>

            {editor && (
                <ServiceTypeFormPopup
                    key={editor.type?.id ?? "new"}
                    service={service}
                    type={editor.type}
                    onClose={() => setEditor(null)}
                    onSaved={(message) => {
                        setEditor(null);
                        reload(message);
                    }}
                />
            )}
            {deactivating && (
                <DeactivateServicePopup
                    key={deactivating.id}
                    service={service}
                    serviceType={deactivating}
                    onClose={() => setDeactivating(null)}
                    onSaved={(message) => {
                        setDeactivating(null);
                        reload(message);
                    }}
                />
            )}
        </Modal>
    );
};

export default ServiceTypesPopup;
