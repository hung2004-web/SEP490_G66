import { MESSAGES, USER_ROLES } from "../utils/messages";
import { findMockStaffByPhone, findMockUserByPhone, saveMockUser } from "../utils/mockData";
import { invalidMessage } from "../utils/validation";
import { clearSession, saveSession } from "./sessionStore";

const MOCK_LOCKED_PHONE = "0900000000";
const MOCK_PASSWORD = "12345678";
const MOCK_DELAY_MS = 800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failure = (message) => ({ success: false, message, data: null, errors: null });

const success = (data) => ({ success: true, message: null, data, errors: null });

const mockSignIn = async ({ phone, password }) => {
    await wait(MOCK_DELAY_MS);

    if (phone === MOCK_LOCKED_PHONE) return failure(MESSAGES.MSG26);
    if (password !== MOCK_PASSWORD) return failure(MESSAGES.MSG24);

    return {
        success: true,
        message: null,
        data: {
            token: "mock-access-token",
            refreshToken: "mock-refresh-token",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        errors: null,
    };
};

export const signIn = async ({ phone, password }) => {
    const result = await mockSignIn({ phone, password });

    if (result.success) {
        const staffAccount = findMockStaffByPhone(phone);
        saveSession({
            token: result.data.token,
            userName: staffAccount?.fullname ?? findMockUserByPhone(phone)?.fullname,
            role: staffAccount?.role ?? USER_ROLES.PATIENT,
        });
    }

    return result;
};

export const signOut = () => clearSession();

export const register = async (userData) => {
    await wait(800); // Giả lập độ trễ mạng

    const existingUser = findMockUserByPhone(userData.phone);
    if (existingUser) {
        return failure("Số điện thoại này đã được đăng ký.");
    }

    // Lưu vào mock data
    saveMockUser(userData);

    return {
        success: true,
        message: "Đăng ký thành công",
        data: null,
        errors: null
    };
};

const MOCK_UNREGISTERED_PHONE = "0900000001";

const mockRequestPasswordReset = async ({ phone }) => {
    await wait(MOCK_DELAY_MS);

    if (phone === MOCK_UNREGISTERED_PHONE) return failure(invalidMessage("Số điện thoại"));

    return success(null);
};

export const requestPasswordReset = async ({ phone, method }) => mockRequestPasswordReset({ phone, method });

const MOCK_OTP_CODE = "123456";
const MOCK_EXPIRED_OTP_CODE = "000000";
const MOCK_RESET_TOKEN = "mock-reset-token";

const mockVerifyOtp = async ({ code }) => {
    await wait(MOCK_DELAY_MS);

    if (code === MOCK_EXPIRED_OTP_CODE) return failure(invalidMessage("Mã xác minh"));
    if (code !== MOCK_OTP_CODE) return failure(invalidMessage("Mã xác minh"));

    return success({ resetToken: MOCK_RESET_TOKEN });
};

export const verifyOtp = async ({ phone, code }) => mockVerifyOtp({ phone, code });

const mockResetPassword = async ({ password }) => {
    await wait(MOCK_DELAY_MS);

    if (password === MOCK_PASSWORD) return failure(MESSAGES.MSG25);

    return success(null);
};

export const resetPassword = async ({ token, password }) => mockResetPassword({ token, password });
