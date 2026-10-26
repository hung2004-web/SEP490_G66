import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock3, Plus, X } from "lucide-react";
import { toast } from "react-toastify";
import CertificatesCard from "@/components/profile/CertificatesCard";
import HealthInfoCard from "@/components/profile/HealthInfoCard";
import Avatar from "@/components/ui/Avatar";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import {
    cancelIdentityRequest,
    getMyProfile,
    requestPhoneChange,
    submitIdentityRequest,
    updateContactInfo,
} from "@/services/profileService";
import { cx } from "@/utils/cx";
import { GENDER_LABELS, PROFILE_LIMITS, PROFILE_MESSAGES, ROLE_LABELS, USER_ROLES, VALIDATION_MESSAGES } from "@/utils/messages";
import { ROUTES, getErrorRoute } from "@/utils/routes";
import { isRequiredEmpty, normalizePhone, requiredMessage, validateEmail, validatePhone } from "@/utils/validation";

const REASON_MAX = 300;

const IDENTITY_FIELDS = [
    { value: "fullname", label: "Họ và tên" },
    { value: "birthdate", label: "Ngày sinh" },
    { value: "gender", label: "Giới tính" },
];

const RELATIONSHIPS = ["Bố", "Mẹ", "Vợ", "Chồng", "Con", "Anh/chị/em", "Khác"];

const EMPTY_CONTACT_PERSON = { fullname: "", relationship: "", phone: "" };

// Local date as YYYY-MM-DD, the format of <input type="date">.
const today = () => new Date().toLocaleDateString("en-CA");

// "1990-01-01" -> "01/01/1990"
const formatDate = (value) => (value ? value.split("-").reverse().join("/") : "");

// "2024-05-12" -> "05/2024"
const formatMonth = (value) => (value ? value.slice(0, 7).split("-").reverse().join("/") : "");

const formatIdentityValue = (field, value) => {
    if (field === "birthdate") return formatDate(value);
    if (field === "gender") return GENDER_LABELS[value] ?? value;
    return value;
};

const identityLabel = (field) => IDENTITY_FIELDS.find((item) => item.value === field)?.label ?? field;

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

// Card with a title row (title, optional description, optional action on the right) and a body.
const SectionCard = ({ id, title, description, action, children }) => (
    <section aria-labelledby={id} className="card-app p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
                <h2 id={id} className="card-title">
                    {title}
                </h2>
                {description && <p className="mt-1 text-caption text-muted">{description}</p>}
            </div>
            {action}
        </div>
        <div className="px-5 py-5">{children}</div>
    </section>
);

const ReadOnlyField = ({ label, value }) => (
    <div className="field">
        <p className="label">{label}</p>
        <p className="input input-readonly">{value || <span className="text-placeholder">Chưa cập nhật</span>}</p>
    </div>
);

// ---------- Identity ----------

const IdentityRequestModal = ({ profile, onClose, onSaved }) => {
    const [field, setField] = useState("birthdate");
    const [newValue, setNewValue] = useState(profile.birthdate);
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const changeField = (event) => {
        setField(event.target.value);
        setNewValue(profile[event.target.value]);
        setErrors({});
    };

    const validate = () => {
        const value = field === "fullname" ? newValue.trim().replace(/\s+/g, " ") : newValue;
        const nextErrors = {};
        if (isRequiredEmpty(value)) nextErrors.newValue = requiredMessage(lowerFirst(identityLabel(field)));
        else if (value === profile[field]) nextErrors.newValue = "Giá trị mới trùng với thông tin hiện tại.";
        else if (field === "fullname" && value.length > PROFILE_LIMITS.FULL_NAME_MAX) nextErrors.newValue = VALIDATION_MESSAGES.FULL_NAME_TOO_LONG;
        else if (field === "birthdate" && value > today()) nextErrors.newValue = VALIDATION_MESSAGES.BIRTHDATE_IN_FUTURE;
        if (isRequiredEmpty(reason)) nextErrors.reason = requiredMessage("lý do");
        return { value, nextErrors };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const { value, nextErrors } = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const result = await submitIdentityRequest({ field, newValue: value, reason: reason.trim() });
        setSaving(false);
        if (!result.success) {
            toast.error(result.message);
            return;
        }
        toast.success(result.message);
        onSaved(result.data);
    };

    const valueProps = {
        id: "identity-newValue",
        "aria-invalid": Boolean(errors.newValue),
        "aria-describedby": errors.newValue ? "identity-newValue-error" : undefined,
    };

    return (
        <Modal
            title="Yêu cầu thay đổi thông tin nhận dạng"
            description="Lễ tân sẽ đối chiếu với giấy tờ tuỳ thân (CCCD) của bạn trước khi duyệt."
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <FormField id="identity-field" label="Thông tin cần đổi" required>
                    <select id="identity-field" className="input" value={field} onChange={changeField}>
                        {IDENTITY_FIELDS.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField id="identity-newValue" label="Giá trị mới" required error={errors.newValue}>
                    {field === "gender" ? (
                        <select {...valueProps} className="input" value={newValue} onChange={(event) => setNewValue(event.target.value)}>
                            <option value="">Chọn giới tính</option>
                            {Object.entries(GENDER_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            {...valueProps}
                            type={field === "birthdate" ? "date" : "text"}
                            className="input"
                            max={field === "birthdate" ? today() : undefined}
                            maxLength={field === "fullname" ? PROFILE_LIMITS.FULL_NAME_MAX : undefined}
                            value={newValue}
                            onChange={(event) => setNewValue(event.target.value)}
                        />
                    )}
                </FormField>
                <FormField id="identity-reason" label="Lý do" required error={errors.reason}>
                    <textarea
                        id="identity-reason"
                        className="input"
                        rows={3}
                        maxLength={REASON_MAX}
                        placeholder="VD: Ngày sinh bị nhập sai so với CCCD."
                        aria-invalid={Boolean(errors.reason)}
                        aria-describedby={errors.reason ? "identity-reason-error" : undefined}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                    />
                </FormField>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Gửi yêu cầu
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const PendingRequestBanner = ({ request, onCancelled }) => {
    const [cancelling, setCancelling] = useState(false);
    const label = identityLabel(request.field);

    const handleCancel = async () => {
        setCancelling(true);
        const result = await cancelIdentityRequest();
        setCancelling(false);
        if (!result.success) {
            toast.error(result.message);
            return;
        }
        toast.info(result.message);
        onCancelled(result.data);
    };

    return (
        <div className="alert alert-warning mt-5">
            <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex-1">
                <p>
                    Đang chờ duyệt: đổi {lowerFirst(label)}{" "}
                    <span className="num">{formatIdentityValue(request.field, request.oldValue)}</span> →{" "}
                    <span className="num font-semibold">{formatIdentityValue(request.field, request.newValue)}</span> (gửi{" "}
                    <span className="num">{formatDate(request.createdAt)}</span>). {label} hiện tại vẫn được dùng cho đến khi yêu cầu
                    được duyệt.
                </p>
                <button type="button" className="btn btn-link mt-1 text-label disabled:bg-transparent" disabled={cancelling} onClick={handleCancel}>
                    Huỷ yêu cầu
                </button>
            </div>
        </div>
    );
};

const IdentitySection = ({ profile, onChange }) => {
    const [requesting, setRequesting] = useState(false);
    const pending = profile.pendingIdentityRequest;

    return (
        <SectionCard
            id="identity-title"
            title="Thông tin nhận dạng"
            description="Dùng để xác định đúng bạn khi khám. Bạn không tự sửa được; gửi yêu cầu để lễ tân kiểm tra giấy tờ."
            action={
                <button
                    type="button"
                    className="btn btn-link shrink-0 text-label disabled:bg-transparent disabled:no-underline"
                    disabled={Boolean(pending)}
                    title={pending ? "Bạn đang có một yêu cầu chờ duyệt" : undefined}
                    onClick={() => setRequesting(true)}
                >
                    Yêu cầu thay đổi
                </button>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Họ và tên" value={profile.fullname} />
                <ReadOnlyField label="Ngày sinh" value={formatDate(profile.birthdate)} />
                <ReadOnlyField label="Giới tính" value={GENDER_LABELS[profile.gender]} />
            </div>
            {pending && <PendingRequestBanner request={pending} onCancelled={onChange} />}
            {requesting && (
                <IdentityRequestModal
                    profile={profile}
                    onClose={() => setRequesting(false)}
                    onSaved={(next) => {
                        setRequesting(false);
                        onChange(next);
                    }}
                />
            )}
        </SectionCard>
    );
};

// ---------- Contact ----------

const goToOtp = (navigate, data) => {
    toast.info(PROFILE_MESSAGES.OTP_SENT);
    navigate(ROUTES.PROFILE_VERIFY_OTP, {
        state: { flow: "profile", isEmail: data.isEmail, maskedDestination: data.maskedDestination },
    });
};

const PhoneChangeModal = ({ onClose }) => {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [error, setError] = useState();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextError = validatePhone(phone);
        setError(nextError);
        if (nextError) return;

        setSaving(true);
        const result = await requestPhoneChange(normalizePhone(phone));
        setSaving(false);
        if (!result.success) {
            setError(result.errors?.phone ?? result.message);
            return;
        }
        goToOtp(navigate, result.data);
    };

    return (
        <Modal
            size="sm"
            title="Đổi số điện thoại"
            description="Số mới dùng để đăng nhập và nhận thông báo. Mã OTP sẽ được gửi qua SMS tới số mới."
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <FormField id="new-phone" label="Số điện thoại mới" required error={error}>
                    <input
                        id="new-phone"
                        type="tel"
                        inputMode="numeric"
                        className="input"
                        placeholder="09xx xxx xxx"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "new-phone-error" : undefined}
                        value={phone}
                        onChange={(event) => {
                            setPhone(event.target.value);
                            setError(undefined);
                        }}
                    />
                </FormField>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Gửi mã OTP
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const toContactValues = (profile) => ({
    email: profile.email,
    address: profile.address,
    emergencyContact: profile.emergencyContact,
});

// Values as they are sent and compared: trimmed, phone without spaces, email in lower case.
const toContactRequest = (values) => ({
    email: values.email.trim().toLowerCase(),
    address: values.address.trim(),
    emergencyContact: values.emergencyContact && {
        fullname: values.emergencyContact.fullname.trim().replace(/\s+/g, " "),
        relationship: values.emergencyContact.relationship,
        phone: normalizePhone(values.emergencyContact.phone),
    },
});

const validateContact = (request) => {
    const errors = {};
    const emailError = validateEmail(request.email);
    if (emailError) errors.email = emailError;
    if (request.address.length > PROFILE_LIMITS.ADDRESS_MAX) errors.address = VALIDATION_MESSAGES.ADDRESS_TOO_LONG;

    const person = request.emergencyContact;
    if (person) {
        if (isRequiredEmpty(person.fullname)) errors.contactName = requiredMessage("họ tên người liên hệ");
        if (!person.relationship) errors.contactRelationship = "Vui lòng chọn mối quan hệ.";
        const phoneError = validatePhone(person.phone);
        if (phoneError) errors.contactPhone = phoneError;
    }
    return errors;
};

const EmergencyContactFields = ({ person, errors, onChange, onRemove }) => {
    const fieldProps = (name, errorKey) => ({
        id: `contact-${name}`,
        value: person[name],
        "aria-invalid": Boolean(errors[errorKey]),
        "aria-describedby": errors[errorKey] ? `contact-${name}-error` : undefined,
        onChange: (event) => onChange({ ...person, [name]: event.target.value }),
    });

    return (
        <div className="rounded-md border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-label text-ink">Người liên hệ khẩn cấp</p>
                <button
                    type="button"
                    className="btn btn-icon size-8 hover:bg-surface-tint"
                    aria-label="Bỏ người liên hệ khẩn cấp"
                    title="Bỏ người liên hệ"
                    onClick={onRemove}
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <FormField id="contact-fullname" label="Họ và tên" required error={errors.contactName}>
                        <input {...fieldProps("fullname", "contactName")} className="input" maxLength={PROFILE_LIMITS.FULL_NAME_MAX} placeholder="VD: Nguyễn Thị B" />
                    </FormField>
                </div>
                <FormField id="contact-relationship" label="Mối quan hệ" required error={errors.contactRelationship}>
                    <select {...fieldProps("relationship", "contactRelationship")} className="input">
                        <option value="">Chọn mối quan hệ</option>
                        {RELATIONSHIPS.map((relationship) => (
                            <option key={relationship} value={relationship}>
                                {relationship}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField id="contact-phone" label="Số điện thoại" required error={errors.contactPhone}>
                    <input {...fieldProps("phone", "contactPhone")} type="tel" inputMode="numeric" className="input" placeholder="09xx xxx xxx" />
                </FormField>
            </div>
        </div>
    );
};

const ContactSection = ({ profile, isPatient, onChange }) => {
    const navigate = useNavigate();
    const [values, setValues] = useState(() => toContactValues(profile));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [changingPhone, setChangingPhone] = useState(false);

    const request = toContactRequest(values);
    const dirty = JSON.stringify(request) !== JSON.stringify(toContactRequest(toContactValues(profile)));

    const update = (changes, clearErrors) => {
        setValues((current) => ({ ...current, ...changes }));
        setErrors((current) => ({ ...current, ...Object.fromEntries(clearErrors.map((key) => [key, undefined])) }));
    };

    const handleCancel = () => {
        setValues(toContactValues(profile));
        setErrors({});
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateContact(request);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const result = await updateContactInfo(isPatient ? request : { email: request.email, address: request.address });
        setSaving(false);
        if (!result.success) {
            if (result.errors) setErrors(result.errors);
            toast.error(result.message);
            return;
        }
        if (result.data.otpRequired) {
            goToOtp(navigate, result.data);
            return;
        }
        toast.success(result.message);
        onChange(result.data);
    };

    return (
        <SectionCard
            id="contact-title"
            title="Thông tin liên hệ"
            description="Bạn có thể tự cập nhật. Số điện thoại và email dùng để đăng nhập nên phải xác minh trước khi đổi."
        >
            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="field">
                    <p className="label label-required">Số điện thoại</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <p className="input input-readonly num max-w-xs flex-1">{profile.phone}</p>
                        <button type="button" className="btn btn-link text-label" onClick={() => setChangingPhone(true)}>
                            Đổi số điện thoại
                        </button>
                    </div>
                    <p className="flex flex-wrap items-center gap-2 text-caption text-muted">
                        <span className="badge badge-success">Đã xác minh</span>
                        Đổi số cần mã OTP gửi về số mới.
                    </p>
                </div>

                <FormField id="contact-email" label="Email" error={errors.email}>
                    <input
                        id="contact-email"
                        type="email"
                        className="input"
                        placeholder="you@example.com"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                        value={values.email}
                        onChange={(event) => update({ email: event.target.value }, ["email"])}
                    />
                </FormField>

                <FormField id="contact-address" label="Địa chỉ liên hệ" error={errors.address}>
                    <input
                        id="contact-address"
                        className="input"
                        maxLength={PROFILE_LIMITS.ADDRESS_MAX}
                        placeholder="VD: Số 12, ngõ 45 Cầu Diễn, Bắc Từ Liêm, Hà Nội"
                        aria-invalid={Boolean(errors.address)}
                        aria-describedby={errors.address ? "contact-address-error" : undefined}
                        value={values.address}
                        onChange={(event) => update({ address: event.target.value }, ["address"])}
                    />
                </FormField>

                {isPatient &&
                    (values.emergencyContact ? (
                        <EmergencyContactFields
                            person={values.emergencyContact}
                            errors={errors}
                            onChange={(person) => update({ emergencyContact: person }, ["contactName", "contactRelationship", "contactPhone"])}
                            onRemove={() => update({ emergencyContact: null }, ["contactName", "contactRelationship", "contactPhone"])}
                        />
                    ) : (
                        <div className="field">
                            <p className="label">Người liên hệ khẩn cấp (không bắt buộc)</p>
                            <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border-strong px-3 py-2.5">
                                <span className="text-body-sm text-placeholder">Chưa cập nhật</span>
                                <button
                                    type="button"
                                    className="btn btn-link gap-1 text-label"
                                    onClick={() => update({ emergencyContact: EMPTY_CONTACT_PERSON }, [])}
                                >
                                    <Plus className="size-3.5" aria-hidden="true" />
                                    Thêm người liên hệ
                                </button>
                            </div>
                        </div>
                    ))}

                {dirty && request.email && request.email !== profile.email.toLowerCase() && (
                    <p className="help-text">Email mới cần xác minh bằng mã OTP gửi tới email đó trước khi được lưu.</p>
                )}

                <div className="flex justify-end gap-3 border-t border-border pt-5">
                    <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={handleCancel}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Lưu thay đổi
                    </button>
                </div>
            </form>
            {changingPhone && <PhoneChangeModal onClose={() => setChangingPhone(false)} />}
        </SectionCard>
    );
};

// ---------- Page ----------

const ProfileSummary = ({ profile, isPatient }) => {
    const meta = isPatient
        ? [
              profile.lastVisitAt && `Lần khám gần nhất: ${formatDate(profile.lastVisitAt)}`,
              profile.createdAt && `Đã đăng ký từ ${formatMonth(profile.createdAt)}`,
          ]
        : [profile.createdAt && `Đã tham gia từ ${formatMonth(profile.createdAt)}`];
    const metaText = meta.filter(Boolean).join(" · ");

    return (
        <div className="card-app flex flex-wrap items-center gap-4">
            <Avatar fullName={profile.fullname} className="size-16 text-heading-2" />
            <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-heading-2 text-ink">{profile.fullname}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                    {isPatient && profile.code ? (
                        <span className="chip-queue num">Mã BN: {profile.code}</span>
                    ) : (
                        <span className="chip-queue">{ROLE_LABELS[profile.role]}</span>
                    )}
                    {profile.status === "active" && <span className="badge badge-success">Đang hoạt động</span>}
                </div>
                {metaText && <p className="num mt-1.5 text-caption text-muted">{metaText}</p>}
            </div>
        </div>
    );
};

const ProfileSkeleton = () => (
    <div className="flex flex-col gap-6" aria-hidden="true">
        <div className="card-app flex items-center gap-4">
            <div className="skeleton size-16 rounded-full" />
            <div className="flex-1 space-y-2">
                <div className="skeleton h-6 w-48" />
                <div className="skeleton h-4 w-32" />
            </div>
        </div>
        <div className="skeleton h-64 max-w-3xl" />
        <div className="skeleton h-80 max-w-3xl" />
    </div>
);

// Shared by every role. Patients also get the emergency contact and health info; doctors get their certificates.
// After an OTP is verified the user comes back here and the profile is loaded again.
// TODO(be): PUT /api/Me only allows the Patient role for now, so staff edits need a backend change.
const ProfilePage = () => {
    const { loading, value } = useAsync(getMyProfile, []);
    const [updated, setUpdated] = useState(null);

    const header = <h1 className="page-title mb-6">Hồ sơ cá nhân</h1>;

    if (loading) {
        return (
            <>
                {header}
                <ProfileSkeleton />
            </>
        );
    }
    if (!value?.success) return <Navigate to={getErrorRoute(404)} replace />;

    const profile = updated ?? value.data;
    const isPatient = profile.role === USER_ROLES.PATIENT;
    const isDoctor = profile.role === USER_ROLES.DOCTOR;
    const hasSideColumn = isPatient || isDoctor;

    return (
        <>
            {header}
            <div className="flex flex-col gap-6">
                <ProfileSummary profile={profile} isPatient={isPatient} />
                <div className={cx("grid grid-cols-1 items-start gap-6", hasSideColumn ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "max-w-3xl")}>
                    <div className="flex flex-col gap-6">
                        <IdentitySection profile={profile} onChange={setUpdated} />
                        {/* key: a saved profile resets the form to the stored values. */}
                        <ContactSection key={JSON.stringify(toContactValues(profile))} profile={profile} isPatient={isPatient} onChange={setUpdated} />
                    </div>
                    {isPatient && <HealthInfoCard health={profile.health} onChange={setUpdated} />}
                    {isDoctor && <CertificatesCard certificates={profile.certificates} onChange={setUpdated} />}
                </div>
            </div>
        </>
    );
};

export default ProfilePage;
