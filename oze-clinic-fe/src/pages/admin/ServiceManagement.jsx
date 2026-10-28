import { useEffect, useState } from "react";
import { ChevronRight, Pencil, Plus, Search, Stethoscope } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import Toggle from "@/components/ui/Toggle";
import useAsync from "@/hooks/useAsync";
import { createService, getServices, setServiceActive, updateService } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { SERVICE_GROUPS } from "@/utils/data/mockServicesAdmin";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 7;
// Same limits as CreateServiceRequest in the backend; the price cap keeps typing sane (999.999.999 ₫).
const SERVICE_LIMITS = { NAME_MAX: 200, CODE_MAX: 20, DESCRIPTION_MAX: 500, PRICE_DIGITS_MAX: 9 };
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const EMPTY_SERVICE_FORM = { name: "", code: "", group: "", price: "", description: "" };

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

const validateService = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên dịch vụ");
    if (isRequiredEmpty(form.code)) errors.code = requiredMessage("mã dịch vụ");
    else if (!CODE_PATTERN.test(form.code.trim())) errors.code = "Mã dịch vụ chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
    if (!form.group) errors.group = "Vui lòng chọn nhóm dịch vụ.";
    if (form.price === "") errors.price = requiredMessage("giá tham khảo");
    return errors;
};

// Price is kept as digits ("18000000") and shown with dots ("18.000.000") while typing.
const formatPriceInput = (digits) => (digits === "" ? "" : priceFormatter.format(Number(digits)));

// Form values as they are sent and compared: trimmed, code in capitals, price as a number.
const toServiceRequest = (form) => ({
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    group: form.group,
    price: Number(form.price),
    description: form.description.trim(),
});

const toServiceForm = (service) => ({
    name: service.name,
    code: service.code,
    group: service.group,
    price: String(service.price),
    description: service.description ?? "",
});

// Add a service (service = null) or update one.
const ServiceFormModal = ({ service, onClose, onSaved }) => {
    const editing = Boolean(service);
    const [form, setForm] = useState(() => (editing ? toServiceForm(service) : EMPTY_SERVICE_FORM));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const setField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const fieldProps = (name) => ({
        id: `service-form-${name}`,
        name,
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `service-form-${name}-error` : undefined,
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateService(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        const request = toServiceRequest(form);
        if (editing && JSON.stringify(request) === JSON.stringify(toServiceRequest(toServiceForm(service)))) {
            toast.info("Không có thông tin nào thay đổi.");
            onClose();
            return;
        }

        setSaving(true);
        const response = editing ? await updateService(service.id, request) : await createService(request);
        setSaving(false);
        if (!response.success) {
            setErrors(response.errors ?? {});
            if (!response.errors) toast.error(response.message);
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal title={editing ? "Cập nhật dịch vụ" : "Thêm dịch vụ"} onClose={onClose} closeDisabled={saving}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="service-form-name" label="Tên dịch vụ" required error={errors.name}>
                        <input
                            {...fieldProps("name")}
                            className="input"
                            placeholder="VD: Niềng răng thẩm mỹ"
                            maxLength={SERVICE_LIMITS.NAME_MAX}
                            value={form.name}
                            onChange={(event) => setField("name", event.target.value)}
                        />
                    </FormField>
                    <FormField id="service-form-code" label="Mã dịch vụ" required error={errors.code}>
                        <input
                            {...fieldProps("code")}
                            className="input uppercase"
                            placeholder="VD: DV050"
                            maxLength={SERVICE_LIMITS.CODE_MAX}
                            value={form.code}
                            onChange={(event) => setField("code", event.target.value)}
                        />
                    </FormField>
                    <FormField id="service-form-group" label="Nhóm dịch vụ" required error={errors.group}>
                        <select
                            {...fieldProps("group")}
                            className={cx("input", !form.group && "text-placeholder")}
                            value={form.group}
                            onChange={(event) => setField("group", event.target.value)}
                        >
                            <option value="">Chọn nhóm</option>
                            {GROUP_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="text-ink">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField id="service-form-price" label="Giá tham khảo (₫)" required error={errors.price}>
                        <input
                            {...fieldProps("price")}
                            className="input num"
                            inputMode="numeric"
                            placeholder="VD: 18.000.000"
                            value={formatPriceInput(form.price)}
                            onChange={(event) =>
                                setField("price", event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, SERVICE_LIMITS.PRICE_DIGITS_MAX))
                            }
                        />
                    </FormField>
                </div>
                <FormField id="service-form-description" label="Mô tả ngắn">
                    <textarea
                        {...fieldProps("description")}
                        className="input"
                        rows={3}
                        placeholder="Hiển thị trên website và khi bệnh nhân đặt lịch"
                        maxLength={SERVICE_LIMITS.DESCRIPTION_MAX}
                        value={form.description}
                        onChange={(event) => setField("description", event.target.value)}
                    />
                </FormField>
                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        {editing ? "Lưu thay đổi" : "Lưu dịch vụ"}
                    </button>
                </div>
            </form>
        </Modal>
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
    // null = closed; { service: null } = add; { service } = update.
    const [editor, setEditor] = useState(null);

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
        setGroup("");
        setStatus("");
        setPage(1);
    };

    // TODO: open the service types popup once its design is ready.
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

            {editor && (
                <ServiceFormModal
                    key={editor.service?.id ?? "new"}
                    service={editor.service}
                    onClose={() => setEditor(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
};

export default ServiceManagement;
