import { useState } from "react";
import { Clock, ImageIcon, MapPin, Phone } from "lucide-react";
import { toast } from "react-toastify";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import { cx } from "@/utils/cx";
import { submitConsultationRequest } from "../../services/contactService";
import {
    CLINIC_ADDRESS,
    CLINIC_HOTLINE,
    CLINIC_MAP_EMBED_URL,
    CLINIC_OPENING_HOURS,
    CONSULTATION_NOTE_MAX_LENGTH,
} from "../../utils/messages";
import { ROUTES } from "../../utils/routes";
import { isRequiredEmpty, normalizePhone, requiredMessage, validateEmail, validatePhone } from "../../utils/validation";

const BREADCRUMB_ITEMS = [{ label: "Trang chủ", href: ROUTES.HOME }, { label: "Liên hệ" }];

const SECTION_CLASS = "py-12 md:py-16";

const EMPTY_VALUES = { fullName: "", phone: "", email: "", note: "" };

const validateFullName = (value) => (isRequiredEmpty(value) ? requiredMessage("họ và tên") : undefined);

// Fields in form order; the first field with an error gets the focus on submit.
const FIELDS = {
    fullName: validateFullName,
    phone: validatePhone,
    email: validateEmail,
};

const validate = (values) => {
    const errors = {};
    for (const [name, validateField] of Object.entries(FIELDS)) {
        const error = validateField(values[name]);
        if (error) errors[name] = error;
    }
    return errors;
};

// TODO: replace with the real banner / clinic photo once the images are ready.
const ImagePlaceholder = ({ className }) => (
    <div className={cx("flex items-center justify-center bg-surface-muted text-placeholder", className)}>
        <ImageIcon className="size-12" aria-hidden="true" />
    </div>
);

const CONTACT_INFO = [
    { key: "phone", Icon: Phone, label: "Số điện thoại", value: CLINIC_HOTLINE.DISPLAY, href: `tel:${CLINIC_HOTLINE.TEL}` },
    { key: "address", Icon: MapPin, label: "Địa chỉ", value: CLINIC_ADDRESS },
    { key: "hours", Icon: Clock, label: "Giờ mở cửa", value: CLINIC_OPENING_HOURS },
];

const ContactPage = () => {
    const [values, setValues] = useState(EMPTY_VALUES);
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        setFieldErrors((current) => ({ ...current, [name]: undefined }));
    };

    // Leaving a filled field validates it; an empty field is only reported on submit (MSG07).
    const handleBlur = (event) => {
        const { name, value } = event.target;
        const validateField = FIELDS[name];
        if (!validateField || value.trim() === "") return;
        setFieldErrors((current) => ({ ...current, [name]: validateField(value) }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        const errors = validate(values);
        setFieldErrors(errors);
        const firstError = Object.keys(FIELDS).find((name) => errors[name]);
        if (firstError) {
            event.currentTarget.elements.namedItem(firstError)?.focus();
            return;
        }

        setLoading(true);
        try {
            const result = await submitConsultationRequest({
                fullName: values.fullName.trim(),
                phone: normalizePhone(values.phone),
                email: values.email.trim(),
                note: values.note.trim(),
            });
            if (result.success) {
                // TODO(spec): no system message is defined for a consultation request yet.
                toast.success("Đăng ký tư vấn thành công! Chúng tôi sẽ liên hệ với bạn sớm.");
                setValues(EMPTY_VALUES);
                return;
            }
            toast.error(result.message);
        } finally {
            setLoading(false);
        }
    };

    // Shared props for every form control: value, handlers and the aria error wiring.
    const fieldProps = (name) => ({
        id: name,
        name,
        className: "input",
        value: values[name],
        onChange: handleChange,
        onBlur: handleBlur,
        "aria-invalid": fieldErrors[name] ? true : undefined,
        "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
    });

    const renderError = (name) =>
        fieldErrors[name] && (
            <p id={`${name}-error`} className="error-text">
                {fieldErrors[name]}
            </p>
        );

    return (
        <div className="bg-canvas">
            <div className="container-public pb-6 pt-3">
                <Breadcrumb items={BREADCRUMB_ITEMS} />
            </div>

            <ImagePlaceholder className="h-48 w-full md:h-72" />

            {/* Clinic address and map */}
            <section className={`container-public ${SECTION_CLASS}`}>
                <h1 className="text-center text-display-md">Địa chỉ phòng khám</h1>
                <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface-tint shadow-md">
                    <iframe
                        title={`Bản đồ Nha khoa OZE - ${CLINIC_ADDRESS}`}
                        src={CLINIC_MAP_EMBED_URL}
                        className="block h-72 w-full md:h-96"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                    />
                </div>
            </section>

            {/* Clinic info and consultation form */}
            <section className="container-public grid grid-cols-1 gap-12 pb-12 md:grid-cols-2 md:pb-16">
                <div className="flex flex-col gap-6">
                    <ImagePlaceholder className="aspect-4/3 w-full rounded-2xl" />
                    <ul className="flex flex-col gap-4">
                        {CONTACT_INFO.map(({ key, Icon, label, value, href }) => (
                            <li key={key} className="flex items-start gap-4">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                                    <Icon className="size-5" aria-hidden="true" />
                                </span>
                                <div className="text-body-md">
                                    <p className="text-label text-muted">{label}</p>
                                    {href ? (
                                        <a href={href} className="num font-semibold hover:underline">
                                            {value}
                                        </a>
                                    ) : (
                                        <p className="text-ink">{value}</p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-heading-1 md:text-display-md">Đăng ký tư vấn miễn phí</h2>
                    <p className="mt-2 text-body-md text-body">
                        Để lại thông tin, đội ngũ OZE sẽ liên hệ tư vấn cho bạn trong thời gian sớm nhất.
                    </p>

                    {/* aria-required only, not the native required attribute, so the browser never shows its own popup. */}
                    <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                        <div className="field">
                            <label htmlFor="fullName" className="label label-required">
                                Họ và tên
                            </label>
                            <input
                                {...fieldProps("fullName")}
                                type="text"
                                autoComplete="name"
                                placeholder="VD: Nguyễn Văn A"
                                aria-required="true"
                            />
                            {renderError("fullName")}
                        </div>

                        <div className="field">
                            <label htmlFor="phone" className="label label-required">
                                Số điện thoại
                            </label>
                            <input
                                {...fieldProps("phone")}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                placeholder="0912 345 678"
                                aria-required="true"
                            />
                            {renderError("phone")}
                        </div>

                        <div className="field">
                            <label htmlFor="email" className="label">
                                Email
                            </label>
                            <input
                                {...fieldProps("email")}
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                            />
                            {renderError("email")}
                        </div>

                        <div className="field">
                            <label htmlFor="note" className="label">
                                Ghi chú
                            </label>
                            <textarea
                                {...fieldProps("note")}
                                rows={4}
                                maxLength={CONSULTATION_NOTE_MAX_LENGTH}
                                placeholder="Mô tả nhu cầu hoặc tình trạng răng miệng bạn muốn được tư vấn."
                            />
                            <p className="help-text num text-right">
                                {values.note.length}/{CONSULTATION_NOTE_MAX_LENGTH}
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                aria-busy={loading || undefined}
                                className="btn btn-primary btn-lg w-full sm:w-auto sm:min-w-40"
                            >
                                {loading && <span className="btn-spinner" aria-hidden="true" />}
                                {loading ? "Đang gửi..." : "Đăng ký"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default ContactPage;
