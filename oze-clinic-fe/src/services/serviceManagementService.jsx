import { MOCK_ADMIN_SERVICES, MOCK_SERVICE_TYPES } from "../utils/data/mockServicesAdmin";

// TODO(api): mock only, swap for /api/Services once the backend has the room type, duration and "price from".
const MOCK_DELAY_MS = 300;

export const SERVICE_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

// Failure tied to one form field, e.g. a name already in use.
const fieldFailure = (field, message) => ({ ...failure(message), errors: { [field]: message } });

const services = MOCK_ADMIN_SERVICES.map((service) => ({ ...service }));

const serviceTypes = MOCK_SERVICE_TYPES.map((type) => ({ ...type }));

const normalize = (value) => value.trim().toLowerCase();

const nextId = (list) => Math.max(0, ...list.map((item) => item.id)) + 1;

const typesOf = (serviceId) => serviceTypes.filter((type) => type.serviceId === serviceId);

// Next service code: DV001, DV002, ...
const nextServiceCode = () => {
    const last = Math.max(0, ...services.map((service) => Number(service.code.replace(/\D/g, "")) || 0));
    return `DV${String(last + 1).padStart(3, "0")}`;
};

// Next type code of a service: DV002-01, DV002-02, ...
const nextTypeCode = (service) => {
    const last = Math.max(0, ...typesOf(service.id).map((type) => Number(type.code.split("-").at(-1)) || 0));
    return `${service.code}-${String(last + 1).padStart(2, "0")}`;
};

// A service with active types takes the price of the cheapest one, shown as "Từ ...".
const syncServicePrice = (serviceId) => {
    const service = services.find((item) => item.id === serviceId);
    const activePrices = typesOf(serviceId)
        .filter((type) => type.isActive)
        .map((type) => type.price);
    if (!service || activePrices.length === 0) return;
    Object.assign(service, { price: Math.min(...activePrices), priceFrom: true });
};

const isServiceNameInUse = (name, exceptId) =>
    services.some((service) => service.id !== exceptId && normalize(service.name) === normalize(name));

const isTypeNameInUse = (serviceId, name, exceptId) =>
    typesOf(serviceId).some((type) => type.id !== exceptId && normalize(type.name) === normalize(name));

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
        .map((service) => ({ ...service, typeCount: typesOf(service.id).length }));

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

const addServiceType = (service, request) => {
    const types = typesOf(service.id);
    const type = {
        id: nextId(serviceTypes),
        serviceId: service.id,
        code: nextTypeCode(service),
        name: request.name.trim(),
        price: request.price,
        durationMinutes: request.durationMinutes,
        sortOrder: Math.max(0, ...types.map((item) => item.sortOrder ?? 0)) + 1,
        description: (request.description ?? "").trim(),
        isActive: true,
    };
    serviceTypes.push(type);
    return type;
};

// request: { name, price, durationMinutes, roomType, description, types: [{ name, price, durationMinutes }] }.
// The code is generated. With types, the price comes from the cheapest type and request.price is ignored.
export const createService = async (request) => {
    await wait(MOCK_DELAY_MS);

    if (isServiceNameInUse(request.name)) return fieldFailure("name", "Tên dịch vụ đã tồn tại.");

    const service = {
        id: nextId(services),
        code: nextServiceCode(),
        name: request.name.trim(),
        description: request.description.trim(),
        roomType: request.roomType,
        price: request.price ?? 0,
        durationMinutes: request.durationMinutes,
        priceFrom: false,
        isActive: true,
    };
    services.unshift(service);
    (request.types ?? []).forEach((type) => addServiceType(service, type));
    syncServicePrice(service.id);

    return success({ ...service }, `Đã thêm dịch vụ ${service.code}.`);
};

// Same fields as createService, without types; code, status and the price of a service with types stay as they are.
export const updateService = async (id, request) => {
    await wait(MOCK_DELAY_MS);

    const service = services.find((item) => item.id === id);
    if (!service) return failure("Dịch vụ không còn tồn tại.");
    if (isServiceNameInUse(request.name, id)) return fieldFailure("name", "Tên dịch vụ đã tồn tại.");

    Object.assign(service, {
        name: request.name.trim(),
        description: request.description.trim(),
        roomType: request.roomType,
        durationMinutes: request.durationMinutes,
    });
    if (typesOf(id).length === 0) Object.assign(service, { price: request.price, priceFrom: false });

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
    const activeTypes = typesOf(id).filter((type) => type.isActive).length;
    return success({ activeTypes, upcomingAppointments: countUpcomingAppointments(id) });
};

export const getServiceTypes = async (serviceId) => {
    await wait(MOCK_DELAY_MS);
    applyScheduledStops(serviceTypes);
    syncServicePrice(serviceId);
    return success(
        typesOf(serviceId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((type) => ({ ...type })),
    );
};

// request: { name, price, durationMinutes, description }. Code and position are generated; a new type is active.
export const createServiceType = async (serviceId, request) => {
    await wait(MOCK_DELAY_MS);

    const service = services.find((item) => item.id === serviceId);
    if (!service) return failure("Dịch vụ không còn tồn tại.");
    if (isTypeNameInUse(serviceId, request.name)) return fieldFailure("name", "Tên loại đã tồn tại trong dịch vụ này.");

    const type = addServiceType(service, request);
    syncServicePrice(serviceId);

    return success({ ...type }, `Đã thêm loại ${type.name}.`);
};

export const updateServiceType = async (id, request) => {
    await wait(MOCK_DELAY_MS);

    const type = serviceTypes.find((item) => item.id === id);
    if (!type) return failure("Loại dịch vụ không còn tồn tại.");
    if (isTypeNameInUse(type.serviceId, request.name, id)) return fieldFailure("name", "Tên loại đã tồn tại trong dịch vụ này.");

    Object.assign(type, {
        name: request.name.trim(),
        price: request.price,
        durationMinutes: request.durationMinutes,
        description: request.description.trim(),
    });
    syncServicePrice(type.serviceId);

    return success({ ...type }, `Đã cập nhật loại ${type.name}.`);
};

export const activateServiceType = async (id) => {
    await wait(MOCK_DELAY_MS);
    const type = serviceTypes.find((item) => item.id === id);
    if (!type) return failure("Loại dịch vụ không còn tồn tại.");
    const response = activate(type);
    syncServicePrice(type.serviceId);
    return response;
};

export const deactivateServiceType = async (id, request) => {
    await wait(MOCK_DELAY_MS);
    const type = serviceTypes.find((item) => item.id === id);
    if (!type) return failure("Loại dịch vụ không còn tồn tại.");
    const response = deactivate(type, serviceTypes, request);
    syncServicePrice(type.serviceId);
    return response;
};

export const getServiceTypeDeactivationImpact = async (id) => {
    await wait(MOCK_DELAY_MS);
    return success({ activeTypes: 0, upcomingAppointments: countUpcomingAppointments(id + 1) });
};
