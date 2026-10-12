import { MOCK_DOCTORS } from "../utils/mockDoctors";

const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getDoctors = async () => {
    await wait(MOCK_DELAY_MS);

    return { success: true, message: null, data: MOCK_DOCTORS, errors: null };
};
