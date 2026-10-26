import { MOCK_ROOMS, ROOM_STATUSES } from "../utils/data/mockRooms";

// TODO(api): mock only, swap for /api/rooms once the backend has code, equipment and "in use by".
const MOCK_DELAY_MS = 300;

export const ROOM_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (errors) => ({ success: false, message: null, data: null, errors });

const rooms = MOCK_ROOMS.map((room) => ({ ...room }));

const normalize = (value) => value.trim().toLowerCase();

const countByStatus = () => ({
    total: rooms.length,
    inUse: rooms.filter((room) => room.status === ROOM_STATUSES.IN_USE).length,
    available: rooms.filter((room) => room.status === ROOM_STATUSES.AVAILABLE).length,
    maintenance: rooms.filter((room) => room.status === ROOM_STATUSES.MAINTENANCE).length,
});

const isCodeInUse = (code, exceptId) =>
    rooms.some((room) => room.id !== exceptId && normalize(room.code) === normalize(code));

const toRoomFields = (request) => ({
    code: request.code.trim().toUpperCase(),
    name: request.name.trim(),
    type: request.type,
    equipment: request.equipment.trim(),
});

export const getRooms = async ({ keyword = "", type = "", status = "", page = 1, pageSize = ROOM_PAGE_SIZE } = {}) => {
    await wait(MOCK_DELAY_MS);

    const search = normalize(keyword);
    const filtered = rooms.filter(
        (room) =>
            (!search || [room.code, room.name, room.equipment, room.usedBy ?? ""].some((field) => normalize(field).includes(search))) &&
            (!type || room.type === type) &&
            (!status || room.status === status),
    );

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((room) => ({ ...room }));

    return success({ items, page: currentPage, pageSize, totalItems, totalPages, stats: countByStatus() });
};

export const createRoom = async (request) => {
    await wait(MOCK_DELAY_MS);

    if (isCodeInUse(request.code)) return failure({ code: "Mã phòng đã tồn tại." });

    const room = {
        id: Math.max(0, ...rooms.map((item) => item.id)) + 1,
        ...toRoomFields(request),
        status: ROOM_STATUSES.AVAILABLE,
        usedBy: null,
    };
    rooms.push(room);

    return success({ ...room }, "Thêm phòng thành công!");
};

export const updateRoom = async (id, request) => {
    await wait(MOCK_DELAY_MS);

    const room = rooms.find((item) => item.id === id);
    if (!room) return failure({ form: "Phòng không còn tồn tại." });
    if (isCodeInUse(request.code, id)) return failure({ code: "Mã phòng đã tồn tại." });

    Object.assign(room, toRoomFields(request));

    return success({ ...room }, "Cập nhật phòng thành công!");
};

// Moves a room into maintenance, or back to available. A room in use cannot change.
export const setRoomMaintenance = async (id, underMaintenance) => {
    await wait(MOCK_DELAY_MS);

    const room = rooms.find((item) => item.id === id);
    if (!room) return failure({ form: "Phòng không còn tồn tại." });
    if (room.status === ROOM_STATUSES.IN_USE) return failure({ form: "Phòng đang được sử dụng, không thể chuyển trạng thái." });

    room.status = underMaintenance ? ROOM_STATUSES.MAINTENANCE : ROOM_STATUSES.AVAILABLE;

    return success(
        { ...room },
        underMaintenance ? `Đã chuyển ${room.code} sang bảo trì.` : `${room.code} đã sẵn sàng sử dụng.`,
    );
};
