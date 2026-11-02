import { useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "react-toastify";
import ServiceTypeFormPopup from "@/components/popup/ServiceTypeFormPopup";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createService, updateService } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { ROOM_TYPE_OPTIONS } from "@/utils/data/mockRooms";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

// Same limits as CreateServiceRequest in the backend; the price cap keeps typing sane (999.999.999 ₫).
const SERVICE_LIMITS = { NAME_MAX: 200, DESCRIPTION_MAX: 500, PRICE_DIGITS_MAX: 9, DURATION_DIGITS_MAX: 3 };
const EMPTY_SERVICE_FORM = { name: "", price: "", durationMinutes: "", roomType: "", description: "" };

const priceFormatter = new Intl.NumberFormat("vi-VN");

// Keeps only digits, without leading zeros, at most maxDigits long.
const toDigits = (value, maxDigits) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, maxDigits);

// Price is kept as digits ("18000000") and shown with dots ("18.000.000") while typing.
const formatPriceInput = (digits) => (digits === "" ? "" : priceFormatter.format(Number(digits)));

const toNumberOrNull = (digits) => (digits === "" ? null : Number(digits));

// hasTypes: the price then comes from the cheapest type, so it is not asked for.
const validateService = (form, hasTypes) => {
    const errors = {};
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên dịch vụ");
    if (!hasTypes && form.price === "") errors.price = requiredMessage("giá tham khảo");
    if (form.durationMinutes !== "" && Number(form.durationMinutes) === 0) errors.durationMinutes = "Thời gian phải lớn hơn 0.";
    return errors;
};

const normalize = (value) => value.trim().toLowerCase();

// Form values as they are sent and compared: trimmed, numbers as numbers.
const toServiceRequest = (form, hasTypes) => ({
    name: form.name.trim(),
    price: hasTypes ? null : Number(form.price),
    durationMinutes: toNumberOrNull(form.durationMinutes),
    roomType: form.roomType,
    description: form.description.trim(),
});

const toServiceForm = (service) => ({
    name: service.name,
    price: String(service.price),
    durationMinutes: service.durationMinutes ? String(service.durationMinutes) : "",
    roomType: service.roomType ?? "",
    description: service.description ?? "",
});

// Placeholder of the price field when the price comes from the types, e.g. "Từ 150.000 ₫ (theo loại rẻ nhất)".
const derivedPriceText = (price) =>
    price === null ? "Theo loại rẻ nhất" : `Từ ${priceFormatter.format(price)} ₫ (theo loại rẻ nhất)`;

// "Thêm dịch vụ" (service = null) or "Cập nhật dịch vụ" popup. onSaved(message) runs after a successful save.
// Types can be added together with a new service; an existing service manages its types in ServiceTypesPopup.
const ServiceFormPopup = ({ service, onClose, onSaved }) => {
    const editing = Boolean(service);
    const [form, setForm] = useState(() => (editing ? toServiceForm(service) : EMPTY_SERVICE_FORM));
    // Types added with a new service, saved together with it: [{ key, name, price, durationMinutes, description }].
    const [types, setTypes] = useState([]);
    // null = closed; { type: null } = add; { type } = edit a draft type.
    const [typeEditor, setTypeEditor] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const nextTypeKey = useRef(1);

    const hasTypes = editing ? service.typeCount > 0 : types.length > 0;
    const derivedPrice = editing ? service.price : hasTypes ? Math.min(...types.map((type) => type.price)) : null;

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

    // Submit of the "Thêm / Sửa loại dịch vụ" popup in draft mode; returns field errors to keep it open.
    const saveDraftType = (request) => {
        const editingKey = typeEditor.type?.key;
        if (types.some((type) => type.key !== editingKey && normalize(type.name) === normalize(request.name))) {
            return { name: "Tên loại đã có trong danh sách." };
        }
        setTypes((current) =>
            editingKey
                ? current.map((type) => (type.key === editingKey ? { ...type, ...request } : type))
                : [...current, { key: nextTypeKey.current++, ...request }],
        );
        setErrors((current) => ({ ...current, price: undefined }));
        setTypeEditor(null);
        return undefined;
    };

    const removeType = (key) => setTypes((current) => current.filter((type) => type.key !== key));

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateService(form, hasTypes);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        const request = toServiceRequest(form, hasTypes);
        if (editing && JSON.stringify(request) === JSON.stringify(toServiceRequest(toServiceForm(service), hasTypes))) {
            toast.info("Không có thông tin nào thay đổi.");
            onClose();
            return;
        }

        setSaving(true);
        const response = editing
            ? await updateService(service.id, request)
            : await createService({
                  ...request,
                  types: types.map(({ name, price, durationMinutes, description }) => ({ name, price, durationMinutes, description })),
              });
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
                <FormField id="service-form-name" label="Tên dịch vụ" required error={errors.name}>
                    <input
                        {...fieldProps("name")}
                        className="input"
                        placeholder="Ví dụ: Tẩy trắng răng"
                        maxLength={SERVICE_LIMITS.NAME_MAX}
                        value={form.name}
                        onChange={(event) => setField("name", event.target.value)}
                    />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="service-form-price" label="Giá tham khảo" required={!hasTypes} error={errors.price}>
                        {hasTypes ? (
                            <input id="service-form-price" className="input" disabled placeholder={derivedPriceText(derivedPrice)} value="" />
                        ) : (
                            <input
                                {...fieldProps("price")}
                                className="input num"
                                inputMode="numeric"
                                placeholder="Ví dụ: 1.500.000"
                                value={formatPriceInput(form.price)}
                                onChange={(event) => setField("price", toDigits(event.target.value, SERVICE_LIMITS.PRICE_DIGITS_MAX))}
                            />
                        )}
                    </FormField>
                    <FormField id="service-form-durationMinutes" label="Thời gian dự kiến (phút)" error={errors.durationMinutes}>
                        <input
                            {...fieldProps("durationMinutes")}
                            className="input num"
                            inputMode="numeric"
                            placeholder="30"
                            value={form.durationMinutes}
                            onChange={(event) => setField("durationMinutes", toDigits(event.target.value, SERVICE_LIMITS.DURATION_DIGITS_MAX))}
                        />
                    </FormField>
                </div>
                <FormField id="service-form-roomType" label="Loại phòng yêu cầu">
                    <select
                        {...fieldProps("roomType")}
                        className={cx("input", !form.roomType && "text-placeholder")}
                        value={form.roomType}
                        onChange={(event) => setField("roomType", event.target.value)}
                    >
                        <option value="">Chọn loại phòng</option>
                        {ROOM_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="text-ink">
                                {option.label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField id="service-form-description" label="Mô tả">
                    <textarea
                        {...fieldProps("description")}
                        className="input"
                        rows={3}
                        placeholder="Ví dụ: Làm trắng men răng, an toàn cho men"
                        maxLength={SERVICE_LIMITS.DESCRIPTION_MAX}
                        value={form.description}
                        onChange={(event) => setField("description", event.target.value)}
                    />
                </FormField>

                {!editing && (
                    <section aria-labelledby="service-form-types-title" className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 id="service-form-types-title" className="font-heading text-title text-ink">
                                    Các loại dịch vụ
                                </h3>
                                <p className="text-caption font-normal text-muted">
                                    Không bắt buộc. Có loại thì giá dịch vụ lấy theo loại rẻ nhất.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn btn-link h-auto shrink-0 font-semibold"
                                onClick={() => setTypeEditor({ type: null })}
                            >
                                + Thêm loại
                            </button>
                        </div>
                        {types.length > 0 && (
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th scope="col">Tên loại dịch vụ</th>
                                            <th scope="col" className="text-right">
                                                Giá tham khảo
                                            </th>
                                            <th scope="col">Thời gian dự kiến</th>
                                            <th scope="col">
                                                <span className="sr-only">Thao tác</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {types.map((type) => (
                                            <tr key={type.key}>
                                                <td className="font-semibold text-ink">{type.name}</td>
                                                <td className="num whitespace-nowrap text-right text-ink">{priceFormatter.format(type.price)} ₫</td>
                                                <td className="num whitespace-nowrap">{type.durationMinutes ? `${type.durationMinutes} phút` : "—"}</td>
                                                <td>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-icon size-8 hover:bg-surface-tint"
                                                            aria-label={`Sửa loại ${type.name}`}
                                                            title="Sửa loại"
                                                            onClick={() => setTypeEditor({ type })}
                                                        >
                                                            <Pencil className="size-4" aria-hidden="true" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-icon size-8 text-danger hover:bg-danger-soft"
                                                            aria-label={`Xoá loại ${type.name}`}
                                                            title="Xoá loại"
                                                            onClick={() => removeType(type.key)}
                                                        >
                                                            <X className="size-4" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

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

            {/* Outside the form: the type popup has its own form. */}
            {typeEditor && (
                <ServiceTypeFormPopup
                    key={typeEditor.type?.key ?? "new"}
                    service={{ name: form.name.trim() }}
                    type={typeEditor.type}
                    onClose={() => setTypeEditor(null)}
                    onSubmit={saveDraftType}
                />
            )}
        </Modal>
    );
};

export default ServiceFormPopup;
