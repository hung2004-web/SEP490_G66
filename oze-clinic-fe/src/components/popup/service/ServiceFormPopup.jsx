import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createService, updateService } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { SERVICE_GROUP_OPTIONS } from "@/utils/data/mockServicesAdmin";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

// Same limits as CreateServiceRequest in the backend; the price cap keeps typing sane (999.999.999 ₫).
const SERVICE_LIMITS = { NAME_MAX: 200, CODE_MAX: 20, DESCRIPTION_MAX: 500, PRICE_DIGITS_MAX: 9 };
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const EMPTY_SERVICE_FORM = { name: "", code: "", group: "", price: "", description: "" };

const priceFormatter = new Intl.NumberFormat("vi-VN");

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

// "Thêm dịch vụ" (service = null) or "Cập nhật dịch vụ" popup. onSaved(message) runs after a successful save.
const ServiceFormPopup = ({ service, onClose, onSaved }) => {
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
                            {SERVICE_GROUP_OPTIONS.map((option) => (
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

export default ServiceFormPopup;
