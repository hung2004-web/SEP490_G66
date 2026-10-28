import { useState } from "react";
import { Eye, Layers, Pencil, Plus } from "lucide-react";
import { toast } from "react-toastify";
import DeactivateServicePopup from "@/components/popup/DeactivateServicePopup";
import ServiceTypeDetailPopup from "@/components/popup/ServiceTypeDetailPopup";
import Drawer from "@/components/ui/Drawer";
import Toggle from "@/components/ui/Toggle";
import useAsync from "@/hooks/useAsync";
import { activateServiceType, getServiceTypes } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { SERVICE_GROUP_OPTIONS } from "@/utils/data/mockServicesAdmin";

const SKELETON_ROW_COUNT = 3;
const COLUMN_COUNT = 5;

const priceFormatter = new Intl.NumberFormat("vi-VN");

const groupLabel = (group) => SERVICE_GROUP_OPTIONS.find((option) => option.value === group)?.label ?? group;

// "2026-10-20" -> "20/10/2026"
const formatDate = (value) => value.split("-").reverse().join("/");

// item: a service or a service type; a scheduled stop shows its date (reason on hover).
const StatusBadge = ({ item }) => {
    if (item.isActive && item.deactivateFrom) {
        return (
            <span className="badge badge-warning num whitespace-nowrap" title={item.deactivateReason ?? undefined}>
                Ngừng từ {formatDate(item.deactivateFrom)}
            </span>
        );
    }
    return (
        <span className={cx("badge whitespace-nowrap", item.isActive ? "badge-success" : "badge-neutral")}>
            {item.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
        </span>
    );
};

// "Loại dịch vụ" drawer opened from a row of the service list.
const ServiceTypesDrawer = ({ service, onClose }) => {
    const [reloadKey, setReloadKey] = useState(0);
    // Type shown in the detail popup / being stopped.
    const [viewing, setViewing] = useState(null);
    const [deactivating, setDeactivating] = useState(null);

    const { loading, value: result } = useAsync(() => getServiceTypes(service.id), [service.id, reloadKey]);
    const types = result?.success ? result.data : [];

    // TODO: open the add / update service type popups once their designs are ready.
    const openCreate = () => {};
    const openEdit = () => {};

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
        toast.success(response.message);
        setReloadKey((current) => current + 1);
        return true;
    };

    return (
        <Drawer
            eyebrow={`${service.code} · Nhóm ${groupLabel(service.group)}`}
            title={service.name}
            badge={<StatusBadge item={service} />}
            onClose={onClose}
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-title text-ink">Loại dịch vụ</h3>
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                    <Plus className="size-4" aria-hidden="true" />
                    Thêm loại
                </button>
            </div>

            <div className="table-wrap">
                <table className="table" aria-busy={loading}>
                    <thead>
                        <tr>
                            <th scope="col">Mã loại</th>
                            <th scope="col">Tên loại</th>
                            <th scope="col" className="text-right">
                                Giá
                            </th>
                            <th scope="col">Trạng thái</th>
                            <th scope="col">Thao tác</th>
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
                            types.map((type) => (
                                    <tr key={type.id}>
                                        <td className="whitespace-nowrap text-muted">{type.code}</td>
                                        <td className="font-semibold text-ink">{type.name}</td>
                                        <td className="whitespace-nowrap text-right font-semibold text-ink">
                                            {priceFormatter.format(type.price)} ₫
                                        </td>
                                        <td>
                                            <StatusBadge item={type} />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    className="btn btn-icon size-8 hover:bg-surface-tint"
                                                    aria-label={`Xem ${type.code}`}
                                                    title="Xem"
                                                    onClick={() => setViewing(type)}
                                                >
                                                    <Eye className="size-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-icon size-8 hover:bg-surface-tint"
                                                    aria-label={`Chỉnh sửa ${type.code}`}
                                                    title="Chỉnh sửa"
                                                    onClick={() => openEdit(type)}
                                                >
                                                    <Pencil className="size-4" aria-hidden="true" />
                                                </button>
                                                <Toggle
                                                    key={`${type.id}-${type.isActive}`}
                                                    className="ml-1"
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

            {viewing && <ServiceTypeDetailPopup type={viewing} service={service} onClose={() => setViewing(null)} />}
            {deactivating && (
                <DeactivateServicePopup
                    key={deactivating.id}
                    service={service}
                    serviceType={deactivating}
                    onClose={() => setDeactivating(null)}
                    onSaved={(message) => {
                        setDeactivating(null);
                        toast.success(message);
                        setReloadKey((current) => current + 1);
                    }}
                />
            )}
        </Drawer>
    );
};

export default ServiceTypesDrawer;
