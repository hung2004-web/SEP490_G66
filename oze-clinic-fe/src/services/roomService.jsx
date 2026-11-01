import { MOCK_ROOMS } from "../utils/data/mockRooms";

// TODO(api): mock only, swap for /api/rooms once the backend has floor and description.
const MOCK_DELAY_MS = 300;

export const ROOM_PAGE_SIZE = 10;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (errors) => ({ success: false, message: null, data: null, errors });

const rooms = MOCK_ROOMS.map((room) => ({ ...room }));

const normalize = (value) => value.trim().toLowerCase();

const isNameInUse = (name, exceptId) =>
    rooms.some((room) => room.id !== exceptId && normalize(room.name) === normalize(name));

const toRoomFields = (request) => ({
    name: request.name.trim(),
    type: request.type,
    floor: request.floor.trim(),
    description: request.description.trim(),
    status: request.status,
});

export const getRooms = async ({ page = 1, pageSize = ROOM_PAGE_SIZE } = {}) => {
    await wait(MOCK_DELAY_MS);

    const totalItems = rooms.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = rooms.slice(start, start + pageSize).map((room) => ({ ...room }));

    return success({ items, page: currentPage, pageSize, totalItems, totalPages });
};

// request: { name, type, floor, description, status }.
export const createRoom = async (request) => {
    await wait(MOCK_DELAY_MS);

    if (isNameInUse(request.name)) return failure({ name: "Tên phòng đã tồn tại." });

    const room = { id: Math.max(0, ...rooms.map((item) => item.id)) + 1, ...toRoomFields(request) };
    rooms.push(room);

    return success({ ...room }, "Thêm phòng thành công!");
};

export const updateRoom = async (id, request) => {
    await wait(MOCK_DELAY_MS);

    const room = rooms.find((item) => item.id === id);
    if (!room) return failure({ form: "Phòng không còn tồn tại." });
    if (isNameInUse(request.name, id)) return failure({ name: "Tên phòng đã tồn tại." });

    Object.assign(room, toRoomFields(request));

    return success({ ...room }, "Cập nhật phòng thành công!");
};
