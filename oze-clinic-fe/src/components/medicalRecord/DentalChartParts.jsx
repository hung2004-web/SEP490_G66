import { cx } from "@/utils/cx";
import { toToothCode } from "@/utils/medicalRecord";
import ToothButton from "./ToothButton";

// Pieces of the dental chart shared by the medical record (read only) and the doctor's exam screen (editable).

const Swatch = ({ tone }) => (
    <span className="size-3.5 shrink-0 overflow-hidden rounded-sm border border-placeholder bg-canvas">
        <span className={cx("block size-full", tone)} />
    </span>
);

export const JawLabel = ({ name }) => (
    <div className="mx-0.5 my-1 flex justify-between text-caption tracking-wide text-placeholder">
        <span>Phải</span>
        <b className="font-bold">{name}</b>
        <span>Trái</span>
    </div>
);

// editable: every tooth can be selected, not only teeth that already have entries.
export const ToothRow = ({ teeth, entries, selectedTooth, onSelect, editable = false }) => (
    <div className="relative grid grid-cols-8 gap-x-0.5 gap-y-2 lg:grid-cols-16 lg:gap-y-0.5">
        {teeth.map((tooth) => (
            <ToothButton
                key={tooth}
                tooth={tooth}
                entries={entries.filter((entry) => toToothCode(entry.tooth) === tooth)}
                selected={selectedTooth === tooth}
                editable={editable}
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
    ];
};

// Legend of the symbols used in the chart. By default only symbols present in entries; showAll lists every symbol.
export const DentalLegend = ({ entries, showAll = false, className }) => (
    <div className={cx("flex flex-wrap gap-x-4 gap-y-2 text-caption text-body", className)}>
        {legendItems(entries)
            .filter(([visible]) => showAll || visible)
            .map(([, symbol, text]) => (
                <div key={text} className="flex grow basis-60 items-center gap-2">
                    {symbol}
                    <span>{text}</span>
                </div>
            ))}
    </div>
);
