import { MOCK_DENTAL_SERVICES } from "../utils/data/mockDentalServices";
import { MOCK_SERVICES } from "../utils/data/mockService";

const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getDentalServices = async () => {
    await wait(MOCK_DELAY_MS);

    return { success: true, message: null, data: MOCK_DENTAL_SERVICES, errors: null };
};

export const getServiceDetail = async (serviceId) => {
    await wait(MOCK_DELAY_MS);

    const service = MOCK_SERVICES.find((item) => item.id === Number(serviceId));
    if (!service) return { success: false, message: "Không tìm thấy dịch vụ.", data: null, errors: null };

    return { success: true, message: null, data: service, errors: null };
};
