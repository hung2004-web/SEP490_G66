import { Contrast, Maximize, Minimize, RefreshCcw, RotateCcw, RotateCw, SunMoon, ZoomIn, ZoomOut } from "lucide-react";
import { cx } from "@/utils/cx";

// 34px outlined buttons, as in the Figma card head (532:4580).
const TOOL =
    "grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-lg border border-border-strong bg-canvas text-ink outline-none transition-colors hover:border-primary hover:text-primary focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-ink pointer-coarse:size-11";
const TOOL_ON = "border-primary bg-primary-soft text-primary";

const Tool = ({ label, shortcut, pressed, disabled, onClick, children }) => (
    <button
        type="button"
        className={cx(TOOL, pressed && TOOL_ON)}
        aria-label={label}
        title={shortcut ? `${label} (${shortcut})` : label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
    >
        {children}
    </button>
);

// Tool buttons of the X-ray viewer, shown in the head of the result card. viewer: the value of useXrayViewer.
const XrayViewerTools = ({ viewer }) => {
    const off = !viewer.hasImage;

    return (
        <div role="toolbar" aria-label="Công cụ xem ảnh" className="flex flex-wrap gap-1.5">
            <Tool label="Thu nhỏ" shortcut="−" disabled={off || !viewer.canZoomOut} onClick={viewer.zoomOut}>
                <ZoomOut className="size-4" aria-hidden="true" />
            </Tool>
            <Tool label="Phóng to" shortcut="+" disabled={off || !viewer.canZoomIn} onClick={viewer.zoomIn}>
                <ZoomIn className="size-4" aria-hidden="true" />
            </Tool>
            <Tool label="Tăng tương phản" shortcut="C" pressed={viewer.contrast} disabled={off} onClick={viewer.toggleContrast}>
                <Contrast className="size-4" aria-hidden="true" />
            </Tool>
            <Tool label="Âm bản" shortcut="I" pressed={viewer.invert} disabled={off} onClick={viewer.toggleInvert}>
                <SunMoon className="size-4" aria-hidden="true" />
            </Tool>
            <Tool label="Xoay trái" disabled={off} onClick={() => viewer.rotate(-90)}>
                <RotateCcw className="size-4" aria-hidden="true" />
            </Tool>
            <Tool label="Xoay phải" shortcut="R" disabled={off} onClick={() => viewer.rotate(90)}>
                <RotateCw className="size-4" aria-hidden="true" />
            </Tool>
            <Tool label="Đặt lại" shortcut="0" disabled={off} onClick={viewer.reset}>
                <RefreshCcw className="size-4" aria-hidden="true" />
            </Tool>
            <Tool label="Toàn màn hình" shortcut="F" disabled={off} onClick={viewer.toggleFullscreen}>
                {viewer.fullscreen ? <Minimize className="size-4" aria-hidden="true" /> : <Maximize className="size-4" aria-hidden="true" />}
            </Tool>
        </div>
    );
};

export default XrayViewerTools;
