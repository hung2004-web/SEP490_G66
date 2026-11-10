import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatElapsed } from "@/utils/examination";

const TICK_MS = 1000;

// Time since the exam started (startedAt in ms), ticking every second. "12:34"
const ExamTimer = ({ startedAt }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, []);

    if (!startedAt) return null;
    const elapsed = formatElapsed((now - startedAt) / 1000);

    return (
        <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface-tint px-2.5 py-1.5" title="Thời gian khám">
            <Clock className="size-4 text-muted" aria-hidden="true" />
            <span className="num font-semibold text-ink" aria-label={`Đã khám ${elapsed}`}>
                {elapsed}
            </span>
        </span>
    );
};

export default ExamTimer;
