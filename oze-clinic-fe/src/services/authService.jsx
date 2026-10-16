import api from "./api";
import { MESSAGES, VERIFICATION_METHOD } from "../utils/messages";
import { findMockUserByPhone } from "../utils/data/mockData";
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

const ACCESS_TOKEN_KEY = "accessToken";
const USER_NAME_KEY = "userFullName";

const rememberUserName = (phone) => {
    const fullName = findMockUserByPhone(phone)?.fullname;
    if (fullName) localStorage.setItem(USER_NAME_KEY, fullName);
    else localStorage.removeItem(USER_NAME_KEY);
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
        localStorage.setItem(ACCESS_TOKEN_KEY, result.data.token);
        rememberUserName(phone);
    }

    return result;
};

export const getSessionUserName = () => localStorage.getItem(USER_NAME_KEY);

export const signOut = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_NAME_KEY);
};

const GENERIC_ERROR = "Có lỗi xảy ra, vui lòng thử lại sau.";

// The backend answers 400 with the same ApiResponse shape, so screens only check result.success.
// Statuses in ERROR_PAGE_STATUSES are already sent to the error page by the interceptor in "./api".
const postApi = async (url, body) => {
    try {
        const response = await api.post(url, body);
        return response.data;
    } catch (error) {
        return error.response?.data ?? failure(GENERIC_ERROR);
    }
};

// The backend expects "Male"/"Female" and "Sms"/"Email".
const GENDER_VALUES = { male: "Male", female: "Female" };
const BACKEND_VERIFICATION_METHOD = { [VERIFICATION_METHOD.SMS]: "Sms", [VERIFICATION_METHOD.EMAIL]: "Email" };

// Returns data: { sessionId, verificationMethod, maskedDestination, expiresAt, resendAvailableAt }.
export const register = async ({ fullname, birthdate, gender, phone, email, password, confirmPassword, method }) =>
    postApi("/api/Auth/register", {
        fullName: fullname.trim(),
        dateOfBirth: birthdate,
        gender: GENDER_VALUES[gender],
        phoneNumber: phone,
        email: email.trim() || null,
        password,
        confirmPassword,
        verificationMethod: BACKEND_VERIFICATION_METHOD[method],
    });

export const verifyRegisterOtp = async ({ sessionId, code }) =>
    postApi("/api/Auth/verify-otp", { sessionId, otp: code });

export const resendRegisterOtp = async ({ sessionId }) => postApi("/api/Auth/resend-otp", { sessionId });

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
