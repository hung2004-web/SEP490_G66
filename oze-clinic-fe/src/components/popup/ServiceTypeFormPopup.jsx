import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createServiceType, updateServiceType } from "@/services/serviceManagementService";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const TYPE_LIMITS = { NAME_MAX: 200, CODE_MAX: 20, DESCRIPTION_MAX: 500, PRICE_DIGITS_MAX: 9, SMALL_DIGITS_MAX: 3 };
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

const priceFormatter = new Intl.NumberFormat("vi-VN");

const validateType = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.code)) errors.code = requiredMessage("mã loại");
    else if (!CODE_PATTERN.test(form.code.trim())) errors.code = "Mã loại chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên loại");
    if (form.price === "") errors.price = requiredMessage("giá tham khảo");
    if (form.durationMinutes !== "" && Number(form.durationMinutes) === 0) errors.durationMinutes = "Thời lượng phải lớn hơn 0.";
    if (form.sortOrder === "") errors.sortOrder = requiredMessage("thứ tự hiển thị");
    return errors;
};

// Keeps only digits, without leading zeros, at most maxDigits long.
const toDigits = (value, maxDigits) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, maxDigits);

const formatPriceInput = (digits) => (digits === "" ? "" : priceFormatter.format(Number(digits)));

const toTypeRequest = (form) => ({
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    price: Number(form.price),
    durationMinutes: form.durationMinutes === "" ? null : Number(form.durationMinutes),
    sortOrder: Number(form.sortOrder),
    description: form.description.trim(),
});

const toTypeForm = (type) => ({
    code: type.code,
    name: type.name,
    price: String(type.price),
    durationMinutes: type.durationMinutes ? String(type.durationMinutes) : "",
    sortOrder: String(type.sortOrder ?? ""),
    description: type.description ?? "",
});

// "Thêm loại dịch vụ" (type = null) or "Cập nhật loại dịch vụ" popup for a service.
// nextSortOrder: suggested position for a new type. onSaved(message) runs after a successful save.
const ServiceTypeFormPopup = ({ service, type, nextSortOrder, onClose, onSaved }) => {
    const editing = Boolean(type);
    const [form, setForm] = useState(() =>
        editing
            ? toTypeForm(type)
            : { code: "", name: "", price: "", durationMinutes: "", sortOrder: String(nextSortOrder), description: "" },
    );
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const setField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const fieldProps = (name) => ({
        id: `service-type-form-${name}`,
        name,
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `service-type-form-${name}-error` : undefined,
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateType(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        const request = toTypeRequest(form);
        if (editing && JSON.stringify(request) === JSON.stringify(toTypeRequest(toTypeForm(type)))) {
            toast.info("Không có thông tin nào thay đổi.");
            onClose();
            return;
        }

        setSaving(true);
        const response = editing ? await updateServiceType(type.id, request) : await createServiceType(service.id, request);
        setSaving(false);
        if (!response.success) {
            setErrors(response.errors ?? {});
            if (!response.errors) toast.error(response.message);
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal
            title={editing ? "Cập nhật loại dịch vụ" : "Thêm loại dịch vụ"}
            description={`Thuộc dịch vụ ${service.name}`}
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="service-type-form-code" label="Mã loại" required error={errors.code}>
                        <input
                            {...fieldProps("code")}
                            className="input uppercase"
                            placeholder={`${service.code}-0${nextSortOrder}`}
                            maxLength={TYPE_LIMITS.CODE_MAX}
                            value={form.code}
                            onChange={(event) => setField("code", event.target.value)}
                        />
                    </FormField>
                    <FormField id="service-type-form-name" label="Tên loại" required error={errors.name}>
                        <input
                            {...fieldProps("name")}
                            className="input"
                            placeholder="Ví dụ: Nửa hàm"
                            maxLength={TYPE_LIMITS.NAME_MAX}
                            value={form.name}
                            onChange={(event) => setField("name", event.target.value)}
                        />
                    </FormField>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <FormField id="service-type-form-price" label="Giá tham khảo (₫)" required error={errors.price}>
                        <input
                            {...fieldProps("price")}
                            className="input num"
                            inputMode="numeric"
                            placeholder="200.000"
                            value={formatPriceInput(form.price)}
                            onChange={(event) => setField("price", toDigits(event.target.value, TYPE_LIMITS.PRICE_DIGITS_MAX))}
                        />
                    </FormField>
                    <FormField id="service-type-form-durationMinutes" label="Thời lượng (phút)" error={errors.durationMinutes}>
                        <input
                            {...fieldProps("durationMinutes")}
                            className="input num"
                            inputMode="numeric"
                            placeholder="25"
                            value={form.durationMinutes}
                            onChange={(event) => setField("durationMinutes", toDigits(event.target.value, TYPE_LIMITS.SMALL_DIGITS_MAX))}
                        />
                    </FormField>
                    <FormField id="service-type-form-sortOrder" label="Thứ tự hiển thị" required error={errors.sortOrder}>
                        <input
                            {...fieldProps("sortOrder")}
                            className="input num"
                            inputMode="numeric"
                            placeholder={String(nextSortOrder)}
                            value={form.sortOrder}
                            onChange={(event) => setField("sortOrder", toDigits(event.target.value, TYPE_LIMITS.SMALL_DIGITS_MAX))}
                        />
                    </FormField>
                </div>
                <FormField id="service-type-form-description" label="Mô tả">
                    <textarea
                        {...fieldProps("description")}
                        className="input"
                        rows={3}
                        maxLength={TYPE_LIMITS.DESCRIPTION_MAX}
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
                        Lưu loại
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ServiceTypeFormPopup;
