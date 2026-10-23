import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, DoorOpen, Pencil, ScanLine, Search, Stethoscope, Syringe, Wrench } from "lucide-react";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import { createRoom, getRooms, setRoomMaintenance, updateRoom } from "@/services/roomService";
import { cx } from "@/utils/cx";
import { ROOM_STATUSES, ROOM_TYPES } from "@/utils/data/mockRooms";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const SEARCH_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 3;
const COLUMN_COUNT = 7;
const ROOM_LIMITS = { CODE_MAX: 10, NAME_MAX: 100, EQUIPMENT_MAX: 200 };

const TYPE_OPTIONS = [
    { value: ROOM_TYPES.EXAMINATION, label: "Khám", icon: Stethoscope },
    { value: ROOM_TYPES.TREATMENT, label: "Điều trị", icon: Syringe },
    { value: ROOM_TYPES.IMAGING, label: "Chẩn đoán hình ảnh", icon: ScanLine },
];

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

const EMPTY_FORM = { code: "", name: "", type: "", equipment: "" };

const ICON_BUTTON_CLASS = "btn btn-secondary btn-icon size-8";

const findOption = (options, value) => options.find((option) => option.value === value);

const validateRoom = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.code)) errors.code = requiredMessage("mã phòng");
    else if (form.code.trim().length > ROOM_LIMITS.CODE_MAX) errors.code = `Mã phòng không được vượt quá ${ROOM_LIMITS.CODE_MAX} ký tự.`;
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên phòng");
    else if (form.name.trim().length > ROOM_LIMITS.NAME_MAX) errors.name = `Tên phòng không được vượt quá ${ROOM_LIMITS.NAME_MAX} ký tự.`;
    if (!form.type) errors.type = "Vui lòng chọn loại phòng.";
    if (form.equipment.trim().length > ROOM_LIMITS.EQUIPMENT_MAX)
        errors.equipment = `Thiết bị chính không được vượt quá ${ROOM_LIMITS.EQUIPMENT_MAX} ký tự.`;
    return errors;
};

const TypeChip = ({ type }) => {
    const option = findOption(TYPE_OPTIONS, type);
    if (!option) return null;
    const Icon = option.icon;

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

const StatCard = ({ label, value, active, onClick }) => (
    <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cx(
            "card-app flex cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-150 hover:border-primary",
            active && "border-primary bg-primary-softer",
        )}
    >
        <span className="stat-label">{label}</span>
        {value === undefined ? (
            <span className="skeleton h-7 w-8" aria-hidden="true" />
        ) : (
            <span className="num font-heading text-heading-2 text-ink">{value}</span>
        )}
    </button>
);

const FormField = ({ id, label, required, error, children }) => (
    <div className="field">
        <label htmlFor={id} className={cx("label", required && "label-required")}>
            {label}
        </label>
        {children}
        {error && (
            <p id={`${id}-error`} className="error-text">
                {error}
            </p>
        )}
    </div>
);

const RoomFormModal = ({ room, onClose, onSaved }) => {
    const editing = Boolean(room);
    const [form, setForm] = useState(() =>
        editing ? { code: room.code, name: room.name, type: room.type, equipment: room.equipment } : EMPTY_FORM,
    );
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const fieldProps = (name) => ({
        id: `room-${name}`,
        name,
        value: form[name],
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `room-${name}-error` : undefined,
        onChange: (event) => {
            setForm((current) => ({ ...current, [name]: event.target.value }));
            setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
        },
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateRoom(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const result = editing ? await updateRoom(room.id, form) : await createRoom(form);
        setSaving(false);

        if (!result.success) {
            setErrors(result.errors ?? {});
            return;
        }
        onSaved(result.message);
    };

    return (
        <Modal
            title={editing ? `Chỉnh sửa phòng ${room.code}` : "Thêm phòng"}
            description={editing ? undefined : "Phòng mới sẽ ở trạng thái Sẵn sàng."}
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {errors.form && (
                    <p role="alert" className="alert alert-danger">
                        {errors.form}
                    </p>
                )}
                <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                    <FormField id="room-code" label="Mã phòng" required error={errors.code}>
                        <input {...fieldProps("code")} className="input uppercase" placeholder="VD: P101" maxLength={ROOM_LIMITS.CODE_MAX} />
                    </FormField>
                    <FormField id="room-name" label="Tên phòng" required error={errors.name}>
                        <input {...fieldProps("name")} className="input" placeholder="VD: Phòng khám" maxLength={ROOM_LIMITS.NAME_MAX} />
                    </FormField>
                </div>
                <FormField id="room-type" label="Loại phòng" required error={errors.type}>
                    <select {...fieldProps("type")} className="input">
                        <option value="">Chọn loại phòng</option>
                        {TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField id="room-equipment" label="Thiết bị chính" error={errors.equipment}>
                    <textarea
                        {...fieldProps("equipment")}
                        className="input"
                        rows={3}
                        placeholder="VD: Ghế nha khoa A-dec 300"
                        maxLength={ROOM_LIMITS.EQUIPMENT_MAX}
                    />
                </FormField>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        {editing ? "Lưu thay đổi" : "Thêm phòng"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const MaintenanceModal = ({ room, onClose, onSaved }) => {
    const confirmRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const startMaintenance = room.status !== ROOM_STATUSES.MAINTENANCE;

    const handleConfirm = async () => {
        setSaving(true);
        const result = await setRoomMaintenance(room.id, startMaintenance);
        setSaving(false);
        if (!result.success) {
            setError(result.errors?.form);
            return;
        }
        onSaved(result.message);
    };

    return (
        <Modal
            size="sm"
            title={startMaintenance ? "Chuyển sang bảo trì?" : "Kết thúc bảo trì?"}
            onClose={onClose}
            initialFocusRef={confirmRef}
            closeDisabled={saving}
        >
            <p className="mt-3">
                {startMaintenance ? (
                    <>
                        Phòng <strong className="text-ink">{room.code} – {room.name}</strong> sẽ không được xếp lịch cho đến khi
                        kết thúc bảo trì.
                    </>
                ) : (
                    <>
                        Phòng <strong className="text-ink">{room.code} – {room.name}</strong> sẽ chuyển về trạng thái Sẵn sàng.
                    </>
                )}
            </p>
            {error && (
                <p role="alert" className="alert alert-danger mt-4">
                    {error}
                </p>
            )}
            <div className="modal-actions">
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                    Hủy
                </button>
                <button ref={confirmRef} type="button" className="btn btn-primary" disabled={saving} onClick={handleConfirm}>
                    {saving && <span className="btn-spinner" aria-hidden="true" />}
                    {startMaintenance ? "Chuyển sang bảo trì" : "Kết thúc bảo trì"}
                </button>
            </div>
        </Modal>
    );
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
            <td className="min-w-48">{room.equipment || <span className="text-muted">—</span>}</td>
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

const Pagination = ({ page, totalPages, onChange }) => (
    <nav aria-label="Phân trang danh sách phòng" className="flex items-center gap-2">
        <button
            type="button"
            className={ICON_BUTTON_CLASS}
            aria-label="Trang trước"
            title="Trang trước"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
        >
            <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
                key={pageNumber}
                type="button"
                className={cx(
                    "btn btn-icon num size-8",
                    pageNumber === page ? "bg-primary-soft text-primary" : "hover:bg-surface-tint",
                )}
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`Trang ${pageNumber}`}
                onClick={() => onChange(pageNumber)}
            >
                {pageNumber}
            </button>
        ))}
        <button
            type="button"
            className={ICON_BUTTON_CLASS}
            aria-label="Trang sau"
            title="Trang sau"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
        >
            <ChevronRight className="size-4" aria-hidden="true" />
        </button>
    </nav>
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
                    {TYPE_OPTIONS.map((option) => (
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
                                <th scope="col">Mã</th>
                                <th scope="col">Tên phòng</th>
                                <th scope="col">Loại</th>
                                <th scope="col">Thiết bị chính</th>
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
                        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
                    </div>
                )}
            </div>

            {dialog?.kind === "form" && (
                <RoomFormModal room={dialog.room} onClose={() => setDialog(null)} onSaved={handleSaved} />
            )}
            {dialog?.kind === "maintenance" && (
                <MaintenanceModal room={dialog.room} onClose={() => setDialog(null)} onSaved={handleSaved} />
            )}
        </div>
    );
};

export default RoomManagement;
