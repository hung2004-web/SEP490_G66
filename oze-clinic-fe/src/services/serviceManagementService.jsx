import { MOCK_ADMIN_SERVICES } from "../utils/data/mockServicesAdmin";

// TODO(api): mock only, swap for /api/Services once the backend has the service group and "price from".
const MOCK_DELAY_MS = 300;

export const SERVICE_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const services = MOCK_ADMIN_SERVICES.map((service) => ({ ...service }));

const normalize = (value) => value.trim().toLowerCase();

// status: "" (all), "active" or "inactive".
export const getServices = async ({ keyword = "", group = "", status = "", page = 1, pageSize = SERVICE_PAGE_SIZE } = {}) => {
    await wait(MOCK_DELAY_MS);

    const search = normalize(keyword);
    const filtered = services.filter(
        (service) =>
            (!search || normalize(service.name).includes(search) || normalize(service.code).includes(search)) &&
            (!group || service.group === group) &&
            (!status || service.isActive === (status === "active")),
    );

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((service) => ({ ...service }));

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

// request: { name, code, group, price, description }. A new service is active and has a fixed price.
export const createService = async (request) => {
    await wait(MOCK_DELAY_MS);

    const code = request.code.trim().toUpperCase();
    if (services.some((service) => service.code === code)) {
        return { ...failure("Mã dịch vụ đã tồn tại."), errors: { code: "Mã dịch vụ đã tồn tại." } };
    }

    const service = {
        id: Math.max(0, ...services.map((item) => item.id)) + 1,
        code,
        name: request.name.trim(),
        description: request.description.trim(),
        group: request.group,
        price: request.price,
        priceFrom: false,
        isActive: true,
    };
    services.unshift(service);

    return success({ ...service }, `Đã thêm dịch vụ ${service.code}.`);
};

// Same fields as createService; status and "price from" stay as they are.
export const updateService = async (id, request) => {
    await wait(MOCK_DELAY_MS);

    const service = services.find((item) => item.id === id);
    if (!service) return failure("Dịch vụ không còn tồn tại.");

    const code = request.code.trim().toUpperCase();
    if (services.some((item) => item.id !== id && item.code === code)) {
        return { ...failure("Mã dịch vụ đã tồn tại."), errors: { code: "Mã dịch vụ đã tồn tại." } };
    }

    Object.assign(service, {
        code,
        name: request.name.trim(),
        description: request.description.trim(),
        group: request.group,
        price: request.price,
    });

    return success({ ...service }, `Đã cập nhật dịch vụ ${service.code}.`);
};

export const setServiceActive = async (id, isActive) => {
    await wait(MOCK_DELAY_MS);

    const service = services.find((item) => item.id === id);
    if (!service) return failure("Dịch vụ không còn tồn tại.");

    service.isActive = isActive;
    return success(
        { ...service },
        isActive ? `Đã kích hoạt lại ${service.code}.` : `Đã ngừng hoạt động ${service.code}.`,
    );
};
