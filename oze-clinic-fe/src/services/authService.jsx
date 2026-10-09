import { MESSAGES } from "../utils/messages";
import { findMockUserByPhone, saveMockUser } from "../utils/mockData";

// Mock cases until the real API is wired:
// - phone "0900000000"                        -> account locked (MSG26)
// - any other phone, password not "12345678"  -> wrong password (MSG24)
// - any other phone, password "12345678"      -> success
const MOCK_LOCKED_PHONE = "0900000000";
const MOCK_PASSWORD = "12345678";
const MOCK_DELAY_MS = 800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failure = (message) => ({ success: false, message, data: null, errors: null });

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
