import { useState } from "react";
import { Layers, Pencil, Plus } from "lucide-react";
import { toast } from "react-toastify";
import DeactivateServicePopup from "@/components/popup/DeactivateServicePopup";
import ServiceTypeFormPopup from "@/components/popup/ServiceTypeFormPopup";
import Drawer from "@/components/ui/Drawer";
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

const servicePrice = (service) => {
    if (service.price === 0) return "Miễn phí";
    return `${service.priceFrom ? "Từ " : ""}${priceFormatter.format(service.price)} ₫`;
};

const SummaryItem = ({ label, children }) => (
    <div className="grid grid-cols-[11rem_1fr] gap-3">
        <dt className="text-muted">{label}</dt>
        <dd className="num font-semibold text-ink">{children}</dd>
    </div>
);

// Drawer with the service summary and its types, opened from a row of the service list.
// onChanged runs after a type is added, updated or switched, so the list can refresh its type count.
const ServiceTypesDrawer = ({ service, onClose, onChanged }) => {
    const [reloadKey, setReloadKey] = useState(0);
    // null = closed; { type: null } = add; { type } = update.
    const [editor, setEditor] = useState(null);
    const [deactivating, setDeactivating] = useState(null);

    const { loading, value: result } = useAsync(() => getServiceTypes(service.id), [service.id, reloadKey]);
    const types = result?.success ? result.data : [];
    const nextSortOrder = Math.max(0, ...types.map((type) => type.sortOrder ?? 0)) + 1;

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
        <Drawer
            title={service.name}
            description={[service.code, roomTypeLabel(service.roomType)].filter(Boolean).join(" · ")}
            onClose={onClose}
        >
            <dl className="flex flex-col gap-2 rounded-lg bg-surface-tint px-4 py-3 text-body-sm">
                <SummaryItem label="Giá tham khảo">{servicePrice(service)}</SummaryItem>
                <SummaryItem label="Thời lượng dự kiến">{service.durationMinutes ? `${service.durationMinutes} phút` : "—"}</SummaryItem>
            </dl>

            <div className="mb-3 mt-6 flex items-center justify-between gap-3">
                <h3 className="text-heading-3 text-ink">Các loại dịch vụ</h3>
                <button type="button" className="btn btn-link h-auto" onClick={() => setEditor({ type: null })}>
                    <Plus className="size-4" aria-hidden="true" />
                    Thêm loại
                </button>
            </div>

            <div className="table-wrap">
                <table className="table" aria-busy={loading}>
                    <thead>
                        <tr>
                            <th scope="col">TT</th>
                            <th scope="col">Mã</th>
                            <th scope="col">Tên loại</th>
                            <th scope="col" className="text-right">
                                Giá
                            </th>
                            <th scope="col">Phút</th>
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
                                    <td className={cx("num", !type.isActive && "opacity-60")}>{index + 1}</td>
                                    <td className={cx("num whitespace-nowrap", !type.isActive && "opacity-60")}>{type.code}</td>
                                    <td className={cx(!type.isActive && "opacity-60")}>
                                        <span className="font-semibold text-ink">{type.name}</span>
                                        {type.isActive && type.deactivateFrom && (
                                            <span className="badge badge-warning num ml-2 whitespace-nowrap" title={type.deactivateReason ?? undefined}>
                                                Ngừng từ {formatDate(type.deactivateFrom)}
                                            </span>
                                        )}
                                    </td>
                                    <td className={cx("num whitespace-nowrap text-right text-ink", !type.isActive && "opacity-60")}>
                                        {priceFormatter.format(type.price)} ₫
                                    </td>
                                    <td className={cx("num", !type.isActive && "opacity-60")}>{type.durationMinutes ?? "—"}</td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-icon size-8"
                                                aria-label={`Chỉnh sửa ${type.code}`}
                                                title="Chỉnh sửa"
                                                onClick={() => setEditor({ type })}
                                            >
                                                <Pencil className="size-4" aria-hidden="true" />
                                            </button>
                                            <Toggle
                                                key={`${type.id}-${type.isActive}`}
                                                checked={type.isActive}
                                                label={type.isActive ? `Ngừng hoạt động ${type.code}` : `Kích hoạt ${type.code}`}
                                                onChange={(next) => handleToggleActive(type, next)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {editor && (
                <ServiceTypeFormPopup
                    key={editor.type?.id ?? "new"}
                    service={service}
                    type={editor.type}
                    nextSortOrder={nextSortOrder}
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
        </Drawer>
    );
};

export default ServiceTypesDrawer;
