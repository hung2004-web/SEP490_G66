// TODO(api): mock only. The backend Rooms API has no floor or description fields yet.
export const ROOM_TYPES = {
    GENERAL: "general",
    MINOR_SURGERY: "minor_surgery",
    SPECIALIZED: "specialized",
    XRAY: "xray",
    RECEPTION: "reception",
};

export const ROOM_TYPE_OPTIONS = [
    { value: ROOM_TYPES.GENERAL, label: "Điều trị tổng quát" },
    { value: ROOM_TYPES.MINOR_SURGERY, label: "Tiểu phẫu" },
    { value: ROOM_TYPES.SPECIALIZED, label: "Điều trị chuyên sâu" },
    { value: ROOM_TYPES.XRAY, label: "Chụp X-quang" },
    { value: ROOM_TYPES.RECEPTION, label: "Tiếp tân" },
];

export const ROOM_STATUSES = {
    ACTIVE: "active",
    MAINTENANCE: "maintenance",
};

export const ROOM_STATUS_OPTIONS = [
    { value: ROOM_STATUSES.ACTIVE, label: "Hoạt động", badge: "badge-success" },
    { value: ROOM_STATUSES.MAINTENANCE, label: "Bảo trì", badge: "badge-warning" },
];

export const roomTypeLabel = (type) => ROOM_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;

export const MOCK_ROOMS = [
    { id: 1, name: "Phòng khám", type: ROOM_TYPES.GENERAL, floor: "Tầng 1", description: "Khám, tư vấn, điều trị tổng quát", status: ROOM_STATUSES.ACTIVE },
    { id: 2, name: "Phòng tiểu phẫu", type: ROOM_TYPES.MINOR_SURGERY, floor: "Tầng 2", description: "Nhổ răng khôn, cắt lợi, Implant", status: ROOM_STATUSES.ACTIVE },
    { id: 3, name: "Phòng điều trị chuyên sâu", type: ROOM_TYPES.SPECIALIZED, floor: "Tầng 2", description: "Niềng răng, lấy dấu, scan iTero", status: ROOM_STATUSES.ACTIVE },
    { id: 4, name: "Phòng chụp chiếu 1", type: ROOM_TYPES.XRAY, floor: "Tầng 1", description: "Panorama, Cephalometric", status: ROOM_STATUSES.ACTIVE },
    { id: 5, name: "Phòng chụp chiếu 2", type: ROOM_TYPES.XRAY, floor: "Tầng 1", description: "Cone beam CT · thay cảm biến đến 26/10", status: ROOM_STATUSES.MAINTENANCE },
    { id: 6, name: "Phòng tiếp tân", type: ROOM_TYPES.RECEPTION, floor: "Tầng 1", description: "Quầy lễ tân, thu ngân", status: ROOM_STATUSES.ACTIVE },
];
