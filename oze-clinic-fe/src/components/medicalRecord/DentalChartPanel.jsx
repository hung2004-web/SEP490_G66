import { cx } from "@/utils/cx";
import { displayText, isPermanentTooth, surfaceText, toToothCode, toothName } from "@/utils/medicalRecord";
import { MEDICAL_RECORD_TOOTH_KIND, MEDICAL_RECORD_TOOTH_STATUS } from "@/utils/messages";
import RecordStatusBadge from "./RecordStatusBadge";
import ToothButton from "./ToothButton";

const ROW_FOCUS_CLASS = "focus-visible:shadow-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const Swatch = ({ tone }) => (
    <span className="size-3.5 shrink-0 overflow-hidden rounded-sm border border-placeholder bg-canvas">
        <span className={cx("block size-full", tone)} />
    </span>
);

const JawLabel = ({ name }) => (
    <div className="mx-0.5 my-1 flex justify-between text-caption tracking-wide text-placeholder">
        <span>Phải</span>
        <b className="font-bold">{name}</b>
        <span>Trái</span>
    </div>
);

const ToothRow = ({ teeth, entries, selectedTooth, onSelect }) => (
    <div className="relative grid grid-cols-8 gap-x-0.5 gap-y-2 lg:grid-cols-16 lg:gap-y-0.5">
        {teeth.map((tooth) => (
            <ToothButton
                key={tooth}
                tooth={tooth}
                entries={entries.filter((entry) => toToothCode(entry.tooth) === tooth)}
                selected={selectedTooth === tooth}
                onSelect={onSelect}
            />
        ))}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 hidden border-l-2 border-dashed border-border lg:block" />
    </div>
);

const legendItems = (entries) => {
    const kinds = new Set(entries.map((entry) => entry.kind));
    const statuses = new Set(entries.map((entry) => entry.st));
    return [
        [entries.some((entry) => entry.surf), <Swatch key="s" tone="bg-primary/45" />, "Ô tô màu = mặt răng có ghi nhận (ô giữa: mặt nhai / rìa cắn; 4 ô quanh: mặt ngoài, trong, gần, xa)"],
        [statuses.has("condition"), <Swatch key="s" tone="bg-danger-solid/45" />, "Đỏ: sâu, mẻ, viêm — cần điều trị"],
        [statuses.has("done"), <Swatch key="s" tone="bg-primary/45" />, "Xanh: đã điều trị"],
        [statuses.has("treating"), <Swatch key="s" tone="bg-warning-solid/60" />, "Cam: đang điều trị dở"],
        [
            kinds.has("pulp") || kinds.has("rct"),
            <span key="s" className="flex shrink-0 gap-0.5">
                <span className="h-4 w-1 rounded-sm bg-danger" />
                <span className="h-4 w-1 rounded-sm bg-warning" />
                <span className="h-4 w-1 rounded-sm bg-primary" />
            </span>,
            "Vạch trong chân răng: tủy răng (đỏ viêm · cam đang chữa · xanh đã trám bít)",
        ],
        [kinds.has("crown"), <span key="s" className="size-4 shrink-0 rounded-sm border-2 border-dashed border-danger" />, "Khung đứt nét đỏ: mão / bọc sứ theo kế hoạch"],
        [
            statuses.has("watch"),
            <span key="s" className="grid size-4 shrink-0 place-items-center rounded-full border border-warning bg-warning-soft text-caption font-bold text-warning">
                !
            </span>,
            "Theo dõi: chưa cần làm, kiểm tra định kỳ",
        ],
    ].filter(([visible]) => visible);
};

const DentalChartPanel = ({ entries, selectedTooth, onSelectTooth }) => {
    const toothCount = new Set(entries.map((entry) => String(entry.tooth))).size;
    const selectByKey = (event, tooth) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectTooth(tooth);
    };

    return (
        <div className="flex flex-col gap-4">
            <section className="card-app p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <h2 className="card-title">Sơ đồ răng buổi này</h2>
                    <span className="text-caption text-muted">{toothCount} răng được ghi nhận</span>
                </div>
                <div className="p-5">
                    <JawLabel name="HÀM TRÊN" />
                    <ToothRow teeth={UPPER_TEETH} entries={entries} selectedTooth={selectedTooth} onSelect={onSelectTooth} />
                    <div className="my-2.5 border-t-2 border-dashed border-border" />
                    <ToothRow teeth={LOWER_TEETH} entries={entries} selectedTooth={selectedTooth} onSelect={onSelectTooth} />
                    <JawLabel name="HÀM DƯỚI" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-5 pb-4 pt-3 text-caption text-body">
                    {legendItems(entries).map(([, symbol, text]) => (
                        <div key={text} className="flex grow basis-60 items-center gap-2">
                            {symbol}
                            <span>{text}</span>
                        </div>
                    ))}
                </div>
            </section>
            <section className="card-app p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <h2 className="card-title">Ghi nhận trong buổi</h2>
                    <span className="num text-caption text-muted">{entries.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Răng</th>
                                <th>Mặt răng</th>
                                <th>Ghi nhận</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => {
                                const tooth = toToothCode(entry.tooth);
                                const selectable = isPermanentTooth(tooth);
                                const selected = selectable && tooth === selectedTooth;
                                return (
                                    <tr
                                        key={entry.id ?? index}
                                        tabIndex={selectable ? 0 : undefined}
                                        className={cx(selectable && "cursor-pointer", ROW_FOCUS_CLASS, selected && "bg-primary-soft")}
                                        onClick={selectable ? () => onSelectTooth(tooth) : undefined}
                                        onKeyDown={selectable ? (event) => selectByKey(event, tooth) : undefined}
                                    >
                                        <td className={cx("py-2", selected && "border-l-3 border-l-primary")}>
                                            <b className="text-ink">{displayText(entry.tooth)}</b>
                                            <p className="text-caption text-muted">{toothName(tooth)}</p>
                                        </td>
                                        <td className="text-caption">{entry.surf ? surfaceText(entry.surf) : "Cả răng"}</td>
                                        <td className="py-2">
                                            {MEDICAL_RECORD_TOOTH_KIND[entry.kind] ?? displayText(entry.kind)}
                                            <p className="text-caption text-muted">{displayText(entry.note)}</p>
                                        </td>
                                        <td>
                                            <RecordStatusBadge status={entry.st} labels={MEDICAL_RECORD_TOOTH_STATUS} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default DentalChartPanel;
