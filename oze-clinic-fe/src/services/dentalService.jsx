import { MOCK_DENTAL_SERVICES } from "../utils/mockDentalServices";

const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getDentalServices = async () => {
    await wait(MOCK_DELAY_MS);

    return { success: true, message: null, data: MOCK_DENTAL_SERVICES, errors: null };
};
