import { getMockCurrentUser, getMockUsers, updateMockUser } from "../utils/data/mockData";
import { VALIDATION_MESSAGES } from "../utils/messages";
import { invalidMessage } from "../utils/validation";
import { updateSessionUserName } from "./sessionStore";

// Mock of GET/PUT /api/Me and its OTP endpoints until the screens use the real API (SCRUM-105).
// Profiles use the form field names: { fullname, birthdate, gender, phone, email, address, role }.
// Required: fullname, birthdate, gender, phone. Optional (may be empty): email, address.

const MOCK_DELAY_MS = 500;
const MOCK_OTP_CODE = "123456";
const NOT_FOUND_MESSAGE = "Không tìm thấy hồ sơ người dùng.";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failure = (message, errors = null) => ({ success: false, message, data: null, errors });

const success = (data, message = null) => ({ success: true, message, data, errors: null });

// Missing values become "" so the form inputs stay controlled.
const toProfile = (user) => ({
    fullname: user.fullname ?? "",
    birthdate: user.birthdate ?? "",
    gender: user.gender ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    address: user.address ?? "",
    role: user.role,
});

const sameEmail = (a, b) => a.toLowerCase() === b.toLowerCase();

// "0912345678" -> "******5678", "test@example.com" -> "t***@example.com"
const maskDestination = (value) =>
    value.includes("@") ? value.replace(/^(.)[^@]*/, "$1***") : value.replace(/\d(?=\d{4})/g, "*");

// Changes waiting for the OTP: nothing is saved until the code is verified.
// Kept in memory, so reloading the OTP page drops them and the user starts again from the profile.
let pendingChanges = null;

export const hasPendingProfileChanges = () => pendingChanges !== null;

export const getMyProfile = async () => {
    await wait(MOCK_DELAY_MS);
    const user = getMockCurrentUser();
    return user ? success(toProfile(user)) : failure(NOT_FOUND_MESSAGE);
};

// Checks the changes and sends the OTP. Returns data: { isEmail, maskedDestination }.
// The screen only calls this when something changed.
export const updateMyProfile = async (values) => {
    await wait(MOCK_DELAY_MS);
    const user = getMockCurrentUser();
    if (!user) return failure(NOT_FOUND_MESSAGE);

    // BR-004: the phone number and email must not belong to another account.
    const others = getMockUsers().filter((u) => u.id !== user.id);
    const errors = {};
    if (others.some((u) => u.phone === values.phone)) errors.phone = VALIDATION_MESSAGES.PHONE_IN_USE;
    if (values.email && others.some((u) => u.email && sameEmail(u.email, values.email))) {
        errors.email = VALIDATION_MESSAGES.EMAIL_IN_USE;
    }
    if (Object.keys(errors).length > 0) return failure(Object.values(errors)[0], errors);

    // Every change is confirmed by email: the new address when the email changed, otherwise the current one.
    // TODO(spec): accounts without an email get the code by SMS until the SRS says otherwise.
    const destination = values.email || user.email || user.phone;
    pendingChanges = { userId: user.id, values };
    return success({ isEmail: destination.includes("@"), maskedDestination: maskDestination(destination) });
};

export const resendProfileOtp = async () => {
    await wait(MOCK_DELAY_MS);
    return pendingChanges ? success(null) : failure("Phiên xác minh đã hết hạn. Vui lòng cập nhật lại.");
};

export const verifyProfileOtp = async ({ code }) => {
    await wait(MOCK_DELAY_MS);
    if (!pendingChanges) return failure("Phiên xác minh đã hết hạn. Vui lòng cập nhật lại.");
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
