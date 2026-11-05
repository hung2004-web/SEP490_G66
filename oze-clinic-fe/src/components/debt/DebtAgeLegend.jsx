import { DEBT_AGE_LEVELS } from "@/utils/data/mockDebts";
import { cx } from "@/utils/cx";

// Explains the row colours in DebtTable, youngest level first.
const DebtAgeLegend = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
        <span className="font-medium text-ink">Nợ lâu được tô màu:</span>
        {[...DEBT_AGE_LEVELS].reverse().map((level) => (
            <span key={level.days} className="flex items-center gap-1.5">
                <span className={cx("size-3.5 rounded-[3px] border", level.swatch)} aria-hidden="true" />
                Quá {level.days} ngày
            </span>
        ))}
    </div>
);

export default DebtAgeLegend;
