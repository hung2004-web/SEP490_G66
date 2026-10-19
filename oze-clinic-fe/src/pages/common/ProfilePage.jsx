import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { toast } from "react-toastify";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import useAsync from "@/hooks/useAsync";
import { getMyProfile, updateMyProfile } from "@/services/profileService";
import { GENDER_LABELS, PROFILE_LIMITS, PROFILE_MESSAGES, ROLE_LABELS, VALIDATION_MESSAGES } from "@/utils/messages";
import { ROUTES, getErrorRoute } from "@/utils/routes";
import { isRequiredEmpty, normalizePhone, requiredMessage, validateEmail, validatePhone } from "@/utils/validation";

const GENERIC_ERROR = "Có lỗi xảy ra, vui lòng thử lại sau.";

// Local date as YYYY-MM-DD, the format of <input type="date">.
const today = () => new Date().toLocaleDateString("en-CA");

// "1990-01-01" -> "01/01/1990"
const formatDate = (value) => (value ? value.split("-").reverse().join("/") : "");

// Values as they are sent and compared: trimmed, single spaces in the name, phone without spaces, email in lower case.
const toRequest = (values) => ({
    fullname: values.fullname.trim().replace(/\s+/g, " "),
    birthdate: values.birthdate,
    gender: values.gender,
    phone: normalizePhone(values.phone),
    email: values.email.trim().toLowerCase(),
    address: values.address.trim(),
});

const hasChanges = (request, profile) => {
    const saved = toRequest(profile);
    return Object.keys(request).some((key) => request[key] !== saved[key]);
};

// Required: full name, birth date, gender, phone. Optional: email, address (same as UpdateProfileRequest).
const validate = (request) => {
    const errors = {};

    if (isRequiredEmpty(request.fullname)) errors.fullname = requiredMessage("họ và tên");
    else if (request.fullname.length > PROFILE_LIMITS.FULL_NAME_MAX) errors.fullname = VALIDATION_MESSAGES.FULL_NAME_TOO_LONG;

    if (isRequiredEmpty(request.birthdate)) errors.birthdate = requiredMessage("ngày sinh");
    else if (request.birthdate > today()) errors.birthdate = VALIDATION_MESSAGES.BIRTHDATE_IN_FUTURE;

    if (!GENDER_LABELS[request.gender]) errors.gender = requiredMessage("giới tính");

    const phoneError = validatePhone(request.phone);
    if (phoneError) errors.phone = phoneError;

    const emailError = validateEmail(request.email);
    if (emailError) errors.email = emailError;

    if (request.address.length > PROFILE_LIMITS.ADDRESS_MAX) errors.address = VALIDATION_MESSAGES.ADDRESS_TOO_LONG;

    return errors;
};

const RequiredMark = () => <span className="text-danger-solid">*</span>;

const InfoItem = ({ label, value, wide }) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
        <dt className="stat-label">{label}</dt>
        <dd className="mt-1 text-body-md text-ink">{value || <span className="text-placeholder">Chưa cập nhật</span>}</dd>
    </div>
);

const ProfileView = ({ profile }) => (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <InfoItem label="Họ và tên" value={profile.fullname} />
        <InfoItem label="Vai trò" value={ROLE_LABELS[profile.role]} />
        <InfoItem label="Ngày sinh" value={formatDate(profile.birthdate)} />
        <InfoItem label="Giới tính" value={GENDER_LABELS[profile.gender]} />
        <InfoItem label="Số điện thoại" value={profile.phone} />
        <InfoItem label="Email" value={profile.email} />
        <InfoItem label="Địa chỉ" value={profile.address} wide />
    </dl>
);

const ProfileForm = ({ profile, onCancel }) => {
    const navigate = useNavigate();
    const [values, setValues] = useState(profile);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        const request = toRequest(values);
        const formErrors = validate(request);
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }
        if (!hasChanges(request, profile)) {
            toast.info(PROFILE_MESSAGES.NO_CHANGES);
            onCancel();
            return;
        }

        setLoading(true);
        try {
            // Checks duplicates (BR-004) and sends the OTP; nothing is saved until the code is verified.
            const result = await updateMyProfile(request);
            if (!result.success) {
                if (result.errors) setErrors(result.errors);
                toast.error(result.message);
                return;
            }
            toast.info(PROFILE_MESSAGES.OTP_SENT);
            navigate(ROUTES.PROFILE_VERIFY_OTP, {
                state: { flow: "profile", isEmail: result.data.isEmail, maskedDestination: result.data.maskedDestination },
            });
        } catch {
            toast.error(GENERIC_ERROR);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Input
                        id="profile-fullname"
                        name="fullname"
                        label={<>Họ và tên <RequiredMark /></>}
                        placeholder="VD: Nguyễn Văn A"
                        maxLength={PROFILE_LIMITS.FULL_NAME_MAX}
                        value={values.fullname}
                        onChange={handleChange}
                        error={errors.fullname}
                    />
                </div>

                <Input
                    id="profile-birthdate"
                    name="birthdate"
                    type="date"
                    label={<>Ngày sinh <RequiredMark /></>}
                    max={today()}
                    value={values.birthdate}
                    onChange={handleChange}
                    error={errors.birthdate}
                />

                <fieldset className="field">
                    <legend className="label mb-1.5">
                        Giới tính <RequiredMark />
                    </legend>
                    <div className="flex h-11 items-center gap-6">
                        {Object.entries(GENDER_LABELS).map(([value, label]) => (
                            <label key={value} className="flex cursor-pointer items-center gap-2 text-body-sm text-ink">
                                <input
                                    type="radio"
                                    name="gender"
                                    value={value}
                                    checked={values.gender === value}
                                    onChange={handleChange}
                                    className="size-4"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    {errors.gender && <p className="error-text">{errors.gender}</p>}
                </fieldset>

                <Input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    label={<>Số điện thoại <RequiredMark /></>}
                    placeholder="09xx xxx xxx"
                    value={values.phone}
                    onChange={handleChange}
                    error={errors.phone}
                />

                <Input
                    id="profile-email"
                    name="email"
                    type="email"
                    label="Email (không bắt buộc)"
                    placeholder="you@example.com"
                    value={values.email}
                    onChange={handleChange}
                    error={errors.email}
                />

                <div className="field sm:col-span-2">
                    <label htmlFor="profile-address" className="label">Địa chỉ (không bắt buộc)</label>
                    <textarea
                        id="profile-address"
                        name="address"
                        className={`input ${errors.address ? "border-danger-solid" : ""}`}
                        rows={3}
                        maxLength={PROFILE_LIMITS.ADDRESS_MAX}
                        value={values.address}
                        onChange={handleChange}
                    />
                    {errors.address && <p className="error-text">{errors.address}</p>}
                </div>
            </div>

            <p className="help-text mt-4">
                Mọi thay đổi cần xác minh bằng mã gửi tới email trước khi lưu. Nếu đổi email, mã sẽ được gửi tới email mới.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                    Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading && <span className="btn-spinner" aria-hidden="true" />}
                    Lưu thay đổi
                </button>
            </div>
        </form>
    );
};

const ProfileSkeleton = () => (
    <Card className="max-w-4xl">
        <div className="flex items-center gap-4">
            <div className="skeleton size-16 rounded-full" />
            <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-4 w-24" />
            </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton h-12" />
            ))}
        </div>
    </Card>
);

const ProfileHeader = () => (
    <div className="page-header">
        <div>
            <h1 className="page-title">Hồ sơ cá nhân</h1>
            <p className="page-description">Xem và cập nhật thông tin cá nhân của bạn.</p>
        </div>
    </div>
);

// Shared by every role; every role can edit its own basic information.
// After the OTP is verified the user comes back here and the profile is loaded again.
// TODO(be): PUT /api/Me only allows the Patient role for now, so staff edits need a backend change.
const ProfilePage = () => {
    const { loading, value } = useAsync(getMyProfile, []);
    const [editing, setEditing] = useState(false);

    if (loading) {
        return (
            <>
                <ProfileHeader />
                <ProfileSkeleton />
            </>
        );
    }
    if (!value?.success) return <Navigate to={getErrorRoute(404)} replace />;

    const profile = value.data;

    return (
        <>
            <ProfileHeader />
            <Card className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-4 border-b border-border pb-6">
                    <Avatar fullName={profile.fullname} className="size-16 text-heading-2" />
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate font-heading text-heading-2 text-ink">{profile.fullname}</h2>
                        <span className="badge badge-info mt-1">{ROLE_LABELS[profile.role]}</span>
                    </div>
                    {!editing && (
                        <button type="button" className="btn btn-secondary gap-2" onClick={() => setEditing(true)}>
                            <Pencil className="size-4" aria-hidden="true" />
                            Chỉnh sửa
                        </button>
                    )}
                </div>

                <div className="pt-6">
                    {editing ? (
                        // A fresh form each time, so Cancel drops every unsaved change (AC5).
                        <ProfileForm profile={profile} onCancel={() => setEditing(false)} />
                    ) : (
                        <ProfileView profile={profile} />
                    )}
                </div>
            </Card>
        </>
    );
};

export default ProfilePage;
