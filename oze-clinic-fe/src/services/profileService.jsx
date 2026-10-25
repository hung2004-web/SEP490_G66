import { getMockCurrentUser, getMockUsers, updateMockUser } from "../utils/data/mockData";
import { VALIDATION_MESSAGES } from "../utils/messages";
import { invalidMessage } from "../utils/validation";
import { updateSessionUserName } from "./sessionStore";

// Mock of GET/PUT /api/Me and its OTP endpoints until the screens use the real API (SCRUM-105).
// TODO(be): code, status, emergencyContact, health, certificates and identity requests are not in /api/Me yet.

const MOCK_DELAY_MS = 500;
const MOCK_OTP_CODE = "123456";
const NOT_FOUND_MESSAGE = "Không tìm thấy hồ sơ người dùng.";
const EXPIRED_MESSAGE = "Phiên xác minh đã hết hạn. Vui lòng cập nhật lại.";

const EMPTY_HEALTH = { medicalHistory: "", allergies: [], medications: "", specialConditions: "" };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failure = (message, errors = null) => ({ success: false, message, data: null, errors });

const success = (data, message = null) => ({ success: true, message, data, errors: null });

// Local date as YYYY-MM-DD.
const today = () => new Date().toLocaleDateString("en-CA");

// Missing values become "" (or empty lists) so the form inputs stay controlled.
const toProfile = (user) => ({
    fullname: user.fullname ?? "",
    birthdate: user.birthdate ?? "",
    gender: user.gender ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    address: user.address ?? "",
    role: user.role,
    code: user.code ?? "",
    status: user.status ?? "active",
    createdAt: user.createdAt ?? "",
    lastVisitAt: user.lastVisitAt ?? "",
    emergencyContact: user.emergencyContact ?? null,
    health: { ...EMPTY_HEALTH, ...user.health },
    certificates: user.certificates ?? [],
    pendingIdentityRequest: user.pendingIdentityRequest ?? null,
});

const sameEmail = (a, b) => a.toLowerCase() === b.toLowerCase();

// "0912345678" -> "******5678", "test@example.com" -> "t***@example.com"
const maskDestination = (value) =>
    value.includes("@") ? value.replace(/^(.)[^@]*/, "$1***") : value.replace(/\d(?=\d{4})/g, "*");

const otherUsers = (user) => getMockUsers().filter((u) => u.id !== user.id);

// Runs fn(user) for the signed-in user, after the mock delay.
const withCurrentUser = async (fn) => {
    await wait(MOCK_DELAY_MS);
    const user = getMockCurrentUser();
    return user ? fn(user) : failure(NOT_FOUND_MESSAGE);
};

const save = (user, changes, message) => success(toProfile(updateMockUser(user.id, changes)), message);

// Changes waiting for the OTP: nothing is saved until the code is verified.
// Kept in memory, so reloading the OTP page drops them and the user starts again from the profile.
let pendingChanges = null;

const startOtp = (user, changes, destination) => {
    pendingChanges = { userId: user.id, values: changes };
    return success({
        otpRequired: true,
        isEmail: destination.includes("@"),
        maskedDestination: maskDestination(destination),
    });
};

export const hasPendingProfileChanges = () => pendingChanges !== null;

export const getMyProfile = () => withCurrentUser((user) => success(toProfile(user)));

// Email, address and (patients) emergency contact. A new email is confirmed by an OTP sent to it;
// otherwise the changes are saved straight away. Returns data.otpRequired, or the updated profile.
export const updateContactInfo = (values) =>
    withCurrentUser((user) => {
        if (values.email && otherUsers(user).some((u) => u.email && sameEmail(u.email, values.email))) {
            return failure(VALIDATION_MESSAGES.EMAIL_IN_USE, { email: VALIDATION_MESSAGES.EMAIL_IN_USE });
        }

        const emailChanged = values.email && !sameEmail(values.email, user.email ?? "");
        if (emailChanged) return startOtp(user, values, values.email);

        return save(user, values, "Cập nhật thông tin liên hệ thành công!");
    });

// The phone number signs the user in, so it changes only after an SMS OTP sent to the new number.
export const requestPhoneChange = (phone) =>
    withCurrentUser((user) => {
        if (phone === user.phone) return failure("Số điện thoại mới trùng với số hiện tại.", { phone: "Số điện thoại mới trùng với số hiện tại." });
        if (otherUsers(user).some((u) => u.phone === phone)) {
            return failure(VALIDATION_MESSAGES.PHONE_IN_USE, { phone: VALIDATION_MESSAGES.PHONE_IN_USE });
        }
        return startOtp(user, { phone }, phone);
    });

export const resendProfileOtp = async () => {
    await wait(MOCK_DELAY_MS);
    return pendingChanges ? success(null) : failure(EXPIRED_MESSAGE);
};

export const verifyProfileOtp = async ({ code }) => {
    await wait(MOCK_DELAY_MS);
    if (!pendingChanges) return failure(EXPIRED_MESSAGE);
    if (code !== MOCK_OTP_CODE) return failure(invalidMessage("Mã xác minh"));

    const { userId, values } = pendingChanges;
    pendingChanges = null;
    const user = updateMockUser(userId, values);
    updateSessionUserName(user.fullname);
    return success(toProfile(user));
};

export const cancelProfileOtp = () => {
    pendingChanges = null;
};

// Name, birth date and gender are changed by the receptionist after checking the ID card. One request at a time.
export const submitIdentityRequest = ({ field, newValue, reason }) =>
    withCurrentUser((user) => {
        if (user.pendingIdentityRequest) return failure("Bạn đang có một yêu cầu chờ duyệt.");
        const request = { field, oldValue: user[field] ?? "", newValue, reason, createdAt: today() };
        return save(user, { pendingIdentityRequest: request }, "Đã gửi yêu cầu thay đổi. Lễ tân sẽ liên hệ để kiểm tra giấy tờ.");
    });

export const cancelIdentityRequest = () =>
    withCurrentUser((user) => save(user, { pendingIdentityRequest: null }, "Đã huỷ yêu cầu thay đổi."));

export const updateHealthInfo = (health) =>
    withCurrentUser((user) => save(user, { health }, "Đã cập nhật thông tin sức khoẻ."));

// Adds a certificate, or replaces the one with the same id.
export const saveCertificate = (certificate) =>
    withCurrentUser((user) => {
        const certificates = user.certificates ?? [];
        const exists = certificates.some((item) => item.id === certificate.id);
        const next = exists
            ? certificates.map((item) => (item.id === certificate.id ? certificate : item))
            : [...certificates, { ...certificate, id: `cert-${Date.now()}` }];
        return save(user, { certificates: next }, exists ? "Đã cập nhật chứng chỉ." : "Đã thêm chứng chỉ.");
    });

export const deleteCertificate = (id) =>
    withCurrentUser((user) =>
        save(user, { certificates: (user.certificates ?? []).filter((item) => item.id !== id) }, "Đã xoá chứng chỉ."),
    );
