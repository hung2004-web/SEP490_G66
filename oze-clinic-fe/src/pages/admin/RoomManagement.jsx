import { useEffect, useState } from "react";
import StatusTabs from "@/components/ui/StatusTabs";
import { CheckCircle2, DoorOpen, Pencil } from "lucide-react";
import RoomFormPopup from "@/components/popup/room/RoomFormPopup";
import FilterSelect from "@/components/ui/FilterSelect";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import useAsync from "@/hooks/useAsync";
import { getRooms } from "@/services/roomService";
import { cx } from "@/utils/cx";
import { ROOM_STATUS_OPTIONS, ROOM_TYPE_OPTIONS, roomTypeLabel } from "@/utils/room";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 3;
const COLUMN_COUNT = 7;

const StatusBadge = ({ status }) => {
    const option = ROOM_STATUS_OPTIONS.find((item) => item.value === status);
    return option ? <span className={cx("badge", option.badge)}>{option.label}</span> : null;
};

const RoomRow = ({ room, index, onEdit }) => (
    <tr>
        <td data-hide-stack className="num">
            {index}
        </td>
        <td data-primary className="cell-primary whitespace-nowrap">
            {room.name}
        </td>
        <td data-label="Loại phòng" className="whitespace-nowrap">
            {roomTypeLabel(room.type)}
        </td>
        <td data-label="Tầng" className="whitespace-nowrap">
            {room.floor || <span className="text-muted">—</span>}
        </td>
        <td data-label="Mô tả">{room.description || <span className="text-muted">—</span>}</td>
        <td data-label="Trạng thái">
            <StatusBadge status={room.status} />
        </td>
        <td data-actions>
            <div className="flex justify-end">
                <button
                    type="button"
                    className="btn btn-secondary btn-icon size-8"
                    aria-label={`Chỉnh sửa ${room.name}`}
                    title="Chỉnh sửa"
                    onClick={() => onEdit(room)}
                >
                    <Pencil className="size-4" aria-hidden="true" />
                </button>
            </div>
        </td>
    </tr>
);

const RoomManagement = () => {
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [type, setType] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [notice, setNotice] = useState(null);

    const { loading, value: result } = useAsync(() => getRooms({ keyword, type, status, page }), [keyword, type, status, page, reloadKey]);

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

    const changeFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearchInput("");
        setKeyword("");
        setType("");
        setStatus("");
        setPage(1);
    };
    const firstItem = data ? (data.page - 1) * data.pageSize + 1 : 0;

    const handleSaved = (message) => {
        setDialog(null);
        setNotice(message);
        setReloadKey((current) => current + 1);
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Phòng</h1>
                    <p className="page-description num">{data ? `${data.totalItems} phòng` : " "}</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setDialog({ room: null })}>
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

            <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                    id="room-search"
                    label="Tìm kiếm phòng"
                    placeholder="Tìm theo tên phòng, tầng, mô tả"
                    value={searchInput}
                    onChange={setSearchInput}
                    className="w-full sm:w-72"
                />
                <FilterSelect
                    id="room-type-filter"
                    label="Loại phòng"
                    options={ROOM_TYPE_OPTIONS}
                    value={type}
                    onChange={changeFilter(setType)}
                    className="w-full sm:w-auto sm:min-w-40"
                />
                <StatusTabs className="w-full" label="Trạng thái" options={ROOM_STATUS_OPTIONS} value={status} onChange={changeFilter(setStatus)} />
                {(filtered || searchInput) && (
                    <button type="button" className="btn btn-link" onClick={clearFilters}>
                        Xoá bộ lọc
                    </button>
                )}
            </div>

            <div>
                <div className="table-wrap">
                    <table className="table table-stack" aria-busy={loading}>
                        <thead>
                            <tr>
                                <th scope="col">STT</th>
                                <th scope="col">Tên phòng</th>
                                <th scope="col">Loại phòng</th>
                                <th scope="col">Tầng</th>
                                <th scope="col">Mô tả</th>
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
                                            <p className="empty-state-title">{filtered ? "Không tìm thấy phòng phù hợp" : "Chưa có phòng nào"}</p>
                                            <p className="empty-state-text">
                                                {filtered ? "Thử đổi từ khóa hoặc bộ lọc." : "Bấm “Thêm phòng” để tạo phòng đầu tiên."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                rooms.map((room, index) => (
                                    <RoomRow key={room.id} room={room} index={firstItem + index} onEdit={(selected) => setDialog({ room: selected })} />
                                ))}
                        </tbody>
                    </table>
                </div>
                {data?.totalItems > 0 && (
                    <div className="mt-4 flex justify-end">
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang danh sách phòng" />
                    </div>
                )}
            </div>

            {dialog && <RoomFormPopup room={dialog.room} onClose={() => setDialog(null)} onSaved={handleSaved} />}
        </div>
    );
};

export default RoomManagement;
