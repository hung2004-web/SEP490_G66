import { MOCK_ADMIN_SERVICES, MOCK_SERVICE_TYPES } from "../utils/data/mockServicesAdmin";

// TODO(api): mock only, swap for /api/Services once the backend has the room type, duration and "price from".
const MOCK_DELAY_MS = 300;

export const SERVICE_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const services = MOCK_ADMIN_SERVICES.map((service) => ({ ...service }));

const serviceTypes = MOCK_SERVICE_TYPES.map((type) => ({ ...type }));

const normalize = (value) => value.trim().toLowerCase();

// roomType: "" (all) or a ROOM_TYPES value. Each item also carries typeCount (its number of service types).
export const getServices = async ({ keyword = "", roomType = "", page = 1, pageSize = SERVICE_PAGE_SIZE } = {}) => {
    await wait(MOCK_DELAY_MS);
    applyScheduledStops(services);

    const search = normalize(keyword);
    const filtered = services.filter(
        (service) =>
            (!search || normalize(service.name).includes(search) || normalize(service.code).includes(search)) &&
            (!roomType || service.roomType === roomType),
    );

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered
        .slice(start, start + pageSize)
        .map((service) => ({ ...service, typeCount: serviceTypes.filter((type) => type.serviceId === service.id).length }));

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

// request: { name, code, roomType, price, durationMinutes, description }. A new service is active and has a fixed price.
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
        roomType: request.roomType,
        price: request.price,
        durationMinutes: request.durationMinutes,
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
        roomType: request.roomType,
        price: request.price,
        durationMinutes: request.durationMinutes,
    });

    return success({ ...service }, `Đã cập nhật dịch vụ ${service.code}.`);
};


// Local date as YYYY-MM-DD.
const today = () => new Date().toLocaleDateString("en-CA");

// "2026-10-20" -> "20/10/2026"
const formatDate = (value) => value.split("-").reverse().join("/");

// Services and types whose stop date has come are switched off (the backend would do this with a daily job).
const applyScheduledStops = (list) => {
    list.forEach((item) => {
        if (item.deactivateFrom && item.deactivateFrom <= today()) {
            item.isActive = false;
            item.deactivateFrom = null;
        }
    });
};

// Turning back on also cancels a scheduled stop.
const activate = (item) => {
    Object.assign(item, { isActive: true, deactivateFrom: null, deactivateReason: null });
    return success({ ...item }, `Đã kích hoạt lại ${item.code}.`);
};

// Stops from effectiveFrom (today = now, a later date = scheduled). Existing appointments stay.
const deactivate = (item, list, { effectiveFrom, reason }) => {
    Object.assign(item, { deactivateFrom: effectiveFrom, deactivateReason: reason.trim() });
    applyScheduledStops(list);
    return success(
        { ...item },
        item.isActive ? `${item.code} sẽ ngừng hoạt động từ ${formatDate(effectiveFrom)}.` : `Đã ngừng hoạt động ${item.code}.`,
    );
};

// TODO(api): made up, read the booked appointments not yet done from the appointments.
const countUpcomingAppointments = (seed) => (seed * 7) % 5;

export const activateService = async (id) => {
    await wait(MOCK_DELAY_MS);
    const service = services.find((item) => item.id === id);
    return service ? activate(service) : failure("Dịch vụ không còn tồn tại.");
};

export const deactivateService = async (id, request) => {
    await wait(MOCK_DELAY_MS);
    const service = services.find((item) => item.id === id);
    return service ? deactivate(service, services, request) : failure("Dịch vụ không còn tồn tại.");
};

// What stopping a service touches: its active types and the upcoming appointments.
export const getDeactivationImpact = async (id) => {
    await wait(MOCK_DELAY_MS);
    applyScheduledStops(serviceTypes);
    const activeTypes = serviceTypes.filter((type) => type.serviceId === id && type.isActive).length;
    return success({ activeTypes, upcomingAppointments: countUpcomingAppointments(id) });
};

export const getServiceTypes = async (serviceId) => {
    await wait(MOCK_DELAY_MS);
    applyScheduledStops(serviceTypes);
    return success(
        serviceTypes
            .filter((type) => type.serviceId === serviceId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((type) => ({ ...type })),
    );
};

const isTypeCodeInUse = (code, exceptId) => serviceTypes.some((type) => type.id !== exceptId && type.code === code);

const toServiceTypeFields = (request) => ({
    code: request.code.trim().toUpperCase(),
    name: request.name.trim(),
    price: request.price,
    durationMinutes: request.durationMinutes,
    sortOrder: request.sortOrder,
    description: request.description.trim(),
});

// request: { code, name, price, durationMinutes, sortOrder, description }. A new type is active.
export const createServiceType = async (serviceId, request) => {
    await wait(MOCK_DELAY_MS);

    const fields = toServiceTypeFields(request);
    if (isTypeCodeInUse(fields.code)) return { ...failure("Mã loại đã tồn tại."), errors: { code: "Mã loại đã tồn tại." } };

    const type = { id: Math.max(0, ...serviceTypes.map((item) => item.id)) + 1, serviceId, ...fields, isActive: true };
    serviceTypes.push(type);

    return success({ ...type }, `Đã thêm loại ${type.code}.`);
};

export const updateServiceType = async (id, request) => {
    await wait(MOCK_DELAY_MS);

    const type = serviceTypes.find((item) => item.id === id);
    if (!type) return failure("Loại dịch vụ không còn tồn tại.");

    const fields = toServiceTypeFields(request);
    if (isTypeCodeInUse(fields.code, id)) return { ...failure("Mã loại đã tồn tại."), errors: { code: "Mã loại đã tồn tại." } };

    Object.assign(type, fields);

    return success({ ...type }, `Đã cập nhật loại ${type.code}.`);
};

export const activateServiceType = async (id) => {
    await wait(MOCK_DELAY_MS);
    const type = serviceTypes.find((item) => item.id === id);
    return type ? activate(type) : failure("Loại dịch vụ không còn tồn tại.");
};

export const deactivateServiceType = async (id, request) => {
    await wait(MOCK_DELAY_MS);
    const type = serviceTypes.find((item) => item.id === id);
    return type ? deactivate(type, serviceTypes, request) : failure("Loại dịch vụ không còn tồn tại.");
};

export const getServiceTypeDeactivationImpact = async (id) => {
    await wait(MOCK_DELAY_MS);
    return success({ activeTypes: 0, upcomingAppointments: countUpcomingAppointments(id + 1) });
};
