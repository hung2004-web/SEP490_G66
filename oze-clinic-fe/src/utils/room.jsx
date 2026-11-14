// Room types and statuses of the Rooms API (RoomConstants / RoomTypeConstants on the backend).
// The shift and service pages still use the mock values in utils/data/mockRooms until they are wired to the API.

export const ROOM_TYPES = {
    GENERAL_TREATMENT: "GeneralTreatment",
    MINOR_SURGERY: "MinorSurgery",
    XRAY: "XRay",
};

export const ROOM_TYPE_OPTIONS = [
    { value: ROOM_TYPES.GENERAL_TREATMENT, label: "Phòng khám" },
    { value: ROOM_TYPES.XRAY, label: "Phòng chụp chiếu" },
    { value: ROOM_TYPES.MINOR_SURGERY, label: "Phòng tiểu phẫu" },
];

export const ROOM_STATUSES = {
    ACTIVE: "Active",
    MAINTENANCE: "Maintenance",
    INACTIVE: "Inactive",
};

export const ROOM_STATUS_OPTIONS = [
    { value: ROOM_STATUSES.ACTIVE, label: "Hoạt động", badge: "badge-success" },
    { value: ROOM_STATUSES.MAINTENANCE, label: "Bảo trì", badge: "badge-warning" },
    { value: ROOM_STATUSES.INACTIVE, label: "Ngừng sử dụng", badge: "badge-neutral" },
];

export const roomTypeLabel = (type) => ROOM_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
