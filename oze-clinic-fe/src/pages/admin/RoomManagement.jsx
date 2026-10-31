import { useEffect, useState } from "react";
import { CheckCircle2, DoorOpen, Pencil, ScanLine, Search, Stethoscope, Syringe, Wrench } from "lucide-react";
import RoomFormPopup from "@/components/popup/room/RoomFormPopup";
import RoomMaintenancePopup from "@/components/popup/room/RoomMaintenancePopup";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import useAsync from "@/hooks/useAsync";
import { getRooms } from "@/services/roomService";
import { cx } from "@/utils/cx";
import { ROOM_STATUSES, ROOM_TYPES, ROOM_TYPE_OPTIONS } from "@/utils/data/mockRooms";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 3;
const COLUMN_COUNT = 6;

const TYPE_ICONS = {
    [ROOM_TYPES.EXAMINATION]: Stethoscope,
    [ROOM_TYPES.TREATMENT]: Syringe,
    [ROOM_TYPES.IMAGING]: ScanLine,
};

const STATUS_OPTIONS = [
    { value: ROOM_STATUSES.IN_USE, label: "Đang sử dụng", badge: "badge-info" },
    { value: ROOM_STATUSES.AVAILABLE, label: "Sẵn sàng", badge: "badge-success" },
    { value: ROOM_STATUSES.MAINTENANCE, label: "Bảo trì", badge: "badge-warning" },
];

const STAT_CARDS = [
    { key: "total", label: "Tổng số phòng" },
    { key: "inUse", label: "Đang sử dụng", status: ROOM_STATUSES.IN_USE },
    { key: "available", label: "Sẵn sàng", status: ROOM_STATUSES.AVAILABLE },
    { key: "maintenance", label: "Bảo trì", status: ROOM_STATUSES.MAINTENANCE },
];

const ICON_BUTTON_CLASS = "btn btn-secondary btn-icon size-8";

const findOption = (options, value) => options.find((option) => option.value === value);

const TypeChip = ({ type }) => {
    const option = findOption(ROOM_TYPE_OPTIONS, type);
    if (!option) return null;
    const Icon = TYPE_ICONS[type];

    return (
        <span className="chip-queue whitespace-nowrap">
            <Icon className="size-3.5" aria-hidden="true" />
            {option.label}
        </span>
    );
};

const StatusBadge = ({ status }) => {
    const option = findOption(STATUS_OPTIONS, status);
    return option ? <span className={cx("badge", option.badge)}>{option.label}</span> : null;
};

const RoomRow = ({ room, onEdit, onMaintenance }) => {
    const inUse = room.status === ROOM_STATUSES.IN_USE;
    const underMaintenance = room.status === ROOM_STATUSES.MAINTENANCE;
    const maintenanceLabel = inUse
        ? "Phòng đang được sử dụng, không thể bảo trì"
        : underMaintenance
          ? `Kết thúc bảo trì ${room.code}`
          : `Chuyển ${room.code} sang bảo trì`;

    return (
        <tr>
            <td className="cell-primary whitespace-nowrap">{room.code}</td>
            <td className="whitespace-nowrap text-ink">{room.name}</td>
            <td>
                <TypeChip type={room.type} />
            </td>
            <td className="whitespace-nowrap">
                {room.usedBy ? <span className="font-medium text-ink">{room.usedBy}</span> : <span className="text-muted">—</span>}
            </td>
            <td>
                <StatusBadge status={room.status} />
            </td>
            <td>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className={ICON_BUTTON_CLASS}
                        aria-label={`Chỉnh sửa ${room.code}`}
                        title="Chỉnh sửa"
                        onClick={() => onEdit(room)}
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <span title={maintenanceLabel}>
                        <button
                            type="button"
                            className={cx(ICON_BUTTON_CLASS, underMaintenance && "border-warning-solid text-warning")}
                            aria-label={maintenanceLabel}
                            aria-pressed={underMaintenance}
                            disabled={inUse}
                            onClick={() => onMaintenance(room)}
                        >
                            <Wrench className="size-4" aria-hidden="true" />
                        </button>
                    </span>
                </div>
            </td>
        </tr>
    );
};

const RoomManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [type, setType] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [notice, setNotice] = useState(null);

    const { loading, value: result } = useAsync(
        () => getRooms({ keyword, type, status, page }),
        [keyword, type, status, page, reloadKey],
    );

    useEffect(() => {
        const nextKeyword = searchInput.trim();
        if (nextKeyword === keyword) return undefined;
        const timer = setTimeout(() => {
            setKeyword(nextKeyword);
            setPage(1);
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [searchInput, keyword]);

    const data = result?.success ? result.data : null;
    const rooms = data?.items ?? [];
    const filtered = Boolean(keyword || type || status);
    const firstItem = data ? (data.page - 1) * data.pageSize + 1 : 0;
    const lastItem = firstItem + rooms.length - 1;

    const changeFilter = (setter) => (event) => {
        setter(event.target.value);
        setPage(1);
    };

    const toggleStatusFilter = (nextStatus) => {
        setStatus((current) => (current === nextStatus ? "" : (nextStatus ?? "")));
        setPage(1);
    };

    const clearFilters = () => {
        setSearchInput("");
        setKeyword("");
        setType("");
        setStatus("");
        setPage(1);
    };

    const handleSaved = (message) => {
        setDialog(null);
        setNotice(message);
        setReloadKey((current) => current + 1);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0 items-center">
                <h1 className="page-title">Phòng</h1>
                <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: "form", room: null })}>
                    Thêm phòng
                </button>
            </div>

            <div role="status">
                {notice && (
                    <p className="alert alert-success">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1">{notice}</span>
                        <button type="button" className="btn btn-link h-auto text-caption" onClick={() => setNotice(null)}>
                            Đóng
                        </button>
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {STAT_CARDS.map((card) => (
                    <StatCard
                        key={card.key}
                        label={card.label}
                        value={data?.stats[card.key]}
                        active={card.status ? status === card.status : !status}
                        onClick={() => toggleStatusFilter(card.status)}
                    />
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="search w-full sm:w-64">
                    <Search aria-hidden="true" />
                    <label htmlFor="room-search" className="sr-only">
                        Tìm phòng
                    </label>
                    <input
                        id="room-search"
                        type="search"
                        className="input"
                        placeholder="Tìm phòng"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                    />
                </div>
                <label htmlFor="room-type-filter" className="sr-only">
                    Loại phòng
                </label>
                <select id="room-type-filter" className="input w-auto" value={type} onChange={changeFilter(setType)}>
                    <option value="">Loại phòng: Tất cả</option>
                    {ROOM_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            Loại phòng: {option.label}
                        </option>
                    ))}
                </select>
                <label htmlFor="room-status-filter" className="sr-only">
                    Trạng thái
                </label>
                <select id="room-status-filter" className="input w-auto" value={status} onChange={changeFilter(setStatus)}>
                    <option value="">Trạng thái: Tất cả</option>
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            Trạng thái: {option.label}
                        </option>
                    ))}
                </select>
                {(filtered || searchInput) && (
                    <button type="button" className="btn btn-link" onClick={clearFilters}>
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            <div>
                <div className="table-wrap">
                    <table className="table" aria-busy={loading}>
                        <thead>
                            <tr>
                                <th scope="col">STT</th>
                                <th scope="col">Tên phòng</th>
                                <th scope="col">Loại</th>
                                <th scope="col">Đang dùng bởi</th>
                                <th scope="col">Trạng thái</th>
                                <th scope="col">
                                    <span className="sr-only">Thao tác</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading &&
                                Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                                    <tr key={index} aria-hidden="true">
                                        {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                                            <td key={cell}>
                                                <div className="skeleton h-4 w-full max-w-32" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            {!loading && rooms.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMN_COUNT}>
                                        <div className="empty-state">
                                            <DoorOpen className="empty-state-icon" aria-hidden="true" />
                                            <p className="empty-state-title">
                                                {filtered ? "Không tìm thấy phòng phù hợp" : "Chưa có phòng nào"}
                                            </p>
                                            <p className="empty-state-text">
                                                {filtered ? "Thử đổi từ khóa hoặc bộ lọc." : "Bấm “Thêm phòng” để tạo phòng đầu tiên."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                rooms.map((room) => (
                                    <RoomRow
                                        key={room.id}
                                        room={room}
                                        onEdit={(selected) => setDialog({ kind: "form", room: selected })}
                                        onMaintenance={(selected) => setDialog({ kind: "maintenance", room: selected })}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
                {data && data.totalItems > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="num text-caption text-muted">
                            Hiển thị {firstItem}–{lastItem} trong {data.totalItems} bản ghi
                        </p>
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang danh sách phòng" />
                    </div>
                )}
            </div>

            {dialog?.kind === "form" && (
                <RoomFormPopup room={dialog.room} onClose={() => setDialog(null)} onSaved={handleSaved} />
            )}
            {dialog?.kind === "maintenance" && (
                <RoomMaintenancePopup room={dialog.room} onClose={() => setDialog(null)} onSaved={handleSaved} />
            )}
        </div>
    );
};

export default RoomManagement;
