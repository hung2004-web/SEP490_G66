const MOCK_DELAY_MS = 800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Returns the ApiResponse shape: { success, message, data, errors }.
// TODO: replace with the shared axios instance from "./api" once the backend has a consultation endpoint.
export const submitConsultationRequest = async ({ fullName, phone, email, note }) => {
    await wait(MOCK_DELAY_MS);

    return { success: true, message: null, data: { fullName, phone, email, note }, errors: null };
};
