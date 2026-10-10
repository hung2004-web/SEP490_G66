import { MESSAGES } from "../utils/constant";
import { invalidMessage } from "../utils/validation";

// Mock cases until the real API is wired:
// - phone "0900000000"                        -> account locked (MSG26)
// - any other phone, password not "12345678"  -> wrong password (MSG24)
// - any other phone, password "12345678"      -> success
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

// Returns the ApiResponse shape: { success, message, data: { token, refreshToken, expiresAt }, errors }.
export const signIn = async ({ phone, password }) => {
    // TODO: replace mockSignIn with the shared axios instance from "./api", e.g. api.post(<login endpoint>, ...).
    // Catch axios errors and return error.response.data so screens keep the same response shape.
    // TODO(spec): the SRS (UC-04, FR 2.1) signs in with phone number, but the backend login model uses email.
    // The team must align the backend contract before wiring.
    const result = await mockSignIn({ phone, password });

    if (result.success) {
        // Same key src/services/api.jsx reads for the Authorization header.
        localStorage.setItem("accessToken", result.data.token);
    }

    return result;
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
