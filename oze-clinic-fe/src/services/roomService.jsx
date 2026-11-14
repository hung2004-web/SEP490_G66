import api from "./api";
import { call } from "./receptionService";

// Rooms of the clinic (api/Rooms, ClinicManager only). The backend returns the whole list sorted by name;
// it is small, so the search and the paging are done here.

export const ROOM_PAGE_SIZE = 10;

// Texts of ErrorConstants.RoomMessage. A room name clash belongs to the name field, the rest to the whole form.
const NAME_MESSAGES = {
    "A room with this name already exists.": "Tên phòng đã tồn tại.",
};
const FORM_MESSAGES = {
    "Room not found.": "Phòng không còn tồn tại.",
    "This room still has upcoming shifts. Move them to another room before changing its type or taking it out of service.":
        "Phòng vẫn còn ca làm sắp tới. Hãy chuyển các ca đó sang phòng khác trước khi đổi loại phòng hoặc ngừng hoạt động.",
    "Room type must be GeneralTreatment, MinorSurgery or XRay.": "Loại phòng không hợp lệ.",
    "Room status must be Active, Maintenance or Inactive.": "Trạng thái phòng không hợp lệ.",
    "Room created successfully.": "Thêm phòng thành công!",
    "Room updated successfully.": "Cập nhật phòng thành công!",
};

const toRoom = (item) => ({
    id: item.id,
    name: item.roomName,
    type: item.roomType,
    floor: item.floor ?? "",
    description: item.description ?? "",
    status: item.status,
});

const toApiRequest = (request) => ({
    roomName: request.name.trim(),
    roomType: request.type,
    floor: request.floor.trim() || null,
    description: request.description.trim() || null,
});

const normalize = (value) => (value ?? "").trim().toLowerCase();

// The page reads errors.name / errors.form, so a failure is put on the field it is about
const toFailure = (result) => {
    if (NAME_MESSAGES[result.message]) return { ...result, errors: { name: NAME_MESSAGES[result.message] } };
    return { ...result, errors: { form: FORM_MESSAGES[result.message] ?? result.message ?? "Có lỗi xảy ra, vui lòng thử lại sau." } };
};

const toSaveResult = (result) =>
    result.success ? { ...result, message: FORM_MESSAGES[result.message] ?? result.message, data: toRoom(result.data) } : toFailure(result);

// keyword matches the name, floor or description; type / status: "" (all) or a ROOM_TYPES / ROOM_STATUSES value of utils/room.
export const getRooms = async ({ keyword = "", type = "", status = "", page = 1, pageSize = ROOM_PAGE_SIZE } = {}) => {
    const result = await call(() => api.get("/api/Rooms", { params: { roomType: type || undefined, status: status || undefined } }));
    if (!result.success) return result;

    const search = normalize(keyword);
    const filtered = result.data
        .map(toRoom)
        .filter((room) => !search || [room.name, room.floor, room.description].some((field) => normalize(field).includes(search)));

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;

    return { ...result, data: { items: filtered.slice(start, start + pageSize), page: currentPage, pageSize, totalItems, totalPages } };
};

// request: { name, type, floor, description }. A new room is always active (the backend sets it).
export const createRoom = async (request) => toSaveResult(await call(() => api.post("/api/Rooms", toApiRequest(request))));

// request: { name, type, floor, description, status }.
export const updateRoom = async (id, request) =>
    toSaveResult(await call(() => api.put(`/api/Rooms/${id}`, { ...toApiRequest(request), status: request.status })));
