// TODO(api): mock only. The backend Rooms API has no code or "in use by" fields yet.
export const ROOM_TYPES = {
    EXAMINATION: "examination",
    TREATMENT: "treatment",
    IMAGING: "imaging",
};

export const ROOM_TYPE_OPTIONS = [
    { value: ROOM_TYPES.EXAMINATION, label: "Khám" },
    { value: ROOM_TYPES.TREATMENT, label: "Điều trị" },
    { value: ROOM_TYPES.IMAGING, label: "Chẩn đoán hình ảnh" },
];

export const ROOM_STATUSES = {
    IN_USE: "in_use",
    AVAILABLE: "available",
    MAINTENANCE: "maintenance",
};

export const MOCK_ROOMS = [
    { id: 1, code: "1", name: "Phòng khám", type: ROOM_TYPES.EXAMINATION, status: ROOM_STATUSES.IN_USE, usedBy: "BS. Trần Minh Khoa" },
    { id: 2, code: "2", name: "Phòng khám 2", type: ROOM_TYPES.EXAMINATION, status: ROOM_STATUSES.AVAILABLE, usedBy: null },
    { id: 3, code: "3", name: "Phòng điều trị", type: ROOM_TYPES.TREATMENT, status: ROOM_STATUSES.IN_USE, usedBy: "BS. Lê Thu Hà" },
    { id: 4, code: "4", name: "Phòng điều trị 2", type: ROOM_TYPES.TREATMENT, status: ROOM_STATUSES.MAINTENANCE, usedBy: null },
    { id: 5, code: "5", name: "Phòng tiểu phẫu", type: ROOM_TYPES.TREATMENT, status: ROOM_STATUSES.AVAILABLE, usedBy: null },
    { id: 6, code: "6", name: "Phòng chụp chiếu", type: ROOM_TYPES.IMAGING, status: ROOM_STATUSES.IN_USE, usedBy: "KTV. Phạm Quốc Bảo" },
    { id: 7, code: "7", name: "Phòng chụp phim 2", type: ROOM_TYPES.IMAGING, status: ROOM_STATUSES.MAINTENANCE, usedBy: null },
];
