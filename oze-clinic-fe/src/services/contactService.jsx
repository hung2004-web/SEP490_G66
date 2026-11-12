import api from "./api";

// Public "Đăng ký tư vấn" form (POST api/consultation-requests, no sign-in). The receptionist sees it in
// "Yêu cầu tư vấn" and calls back. Returns the ApiResponse shape: { success, message, data, errors }.
export const submitConsultationRequest = async ({ fullName, phone, email, note }) => {
    try {
        const response = await api.post("/api/consultation-requests", { fullName, phoneNumber: phone, email: email || null, note: note || null });
        return response.data;
    } catch (error) {
        const body = error.response?.data;
        if (body && typeof body.success === "boolean") return body;
        return { success: false, message: "Không gửi được yêu cầu. Vui lòng thử lại hoặc gọi phòng khám.", data: null, errors: null };
    }
};
