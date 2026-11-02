import { useState } from "react";
import { CheckCircle2, DoorOpen, Pencil } from "lucide-react";
import RoomFormPopup from "@/components/popup/room/RoomFormPopup";
import Pagination from "@/components/ui/Pagination";
import useAsync from "@/hooks/useAsync";
import { getRooms } from "@/services/roomService";
import { cx } from "@/utils/cx";
import { ROOM_STATUS_OPTIONS, roomTypeLabel } from "@/utils/data/mockRooms";

const SKELETON_ROW_COUNT = 3;
const COLUMN_COUNT = 7;

const StatusBadge = ({ status }) => {
    const option = ROOM_STATUS_OPTIONS.find((item) => item.value === status);
    return option ? <span className={cx("badge", option.badge)}>{option.label}</span> : null;
};

const RoomRow = ({ room, index, onEdit }) => (
    <tr>
        <td className="num">{index}</td>
        <td className="cell-primary whitespace-nowrap">{room.name}</td>
        <td className="whitespace-nowrap">{roomTypeLabel(room.type)}</td>
        <td className="whitespace-nowrap">{room.floor || <span className="text-muted">—</span>}</td>
        <td>{room.description || <span className="text-muted">—</span>}</td>
        <td>
            <StatusBadge status={room.status} />
        </td>
        <td>
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
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [notice, setNotice] = useState(null);

    const { loading, value: result } = useAsync(() => getRooms({ page }), [page, reloadKey]);

    const data = result?.success ? result.data : null;
    const rooms = data?.items ?? [];
    const firstItem = data ? (data.page - 1) * data.pageSize + 1 : 0;
    const lastItem = firstItem + rooms.length - 1;

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

            <div>
                <div className="table-wrap">
                    <table className="table" aria-busy={loading}>
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
                                            <p className="empty-state-title">Chưa có phòng nào</p>
                                            <p className="empty-state-text">Bấm “Thêm phòng” để tạo phòng đầu tiên.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                rooms.map((room, index) => (
                                    <RoomRow
                                        key={room.id}
                                        room={room}
                                        index={firstItem + index}
                                        onEdit={(selected) => setDialog({ room: selected })}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
                {data && data.totalItems > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="num text-caption text-muted">
                            Hiển thị {firstItem}–{lastItem} trong {data.totalItems} phòng
                        </p>
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="Phân trang danh sách phòng" />
                    </div>
                )}
            </div>

            {dialog && <RoomFormPopup room={dialog.room} onClose={() => setDialog(null)} onSaved={handleSaved} />}
        </div>
    );
};

export default RoomManagement;
