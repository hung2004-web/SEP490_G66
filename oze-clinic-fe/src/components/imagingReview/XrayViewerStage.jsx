import { ChevronLeft, ChevronRight, Image as ImageIcon, Minimize } from "lucide-react";
import { cx } from "@/utils/cx";

const OVERLAY = "rounded-md bg-surface-navy/70 px-2 py-0.5 text-caption ring-1 ring-white/15";
const NAV =
    "absolute top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-surface-navy/70 text-on-navy outline-none ring-1 ring-white/15 hover:bg-surface-navy focus-visible:shadow-focus";

// Keeps clicks on the overlay buttons from starting a drag or a double-click zoom on the stage.
const stopStage = { onPointerDown: (event) => event.stopPropagation(), onDoubleClick: (event) => event.stopPropagation() };

// Image area of the X-ray viewer (navy stage, previous / next, thumbnails). [stageRef, viewer]: from useXrayViewer;
// images: [{ id, url? }]; label: "X-quang toàn cảnh". An image without url shows the Figma placeholder.
const XrayViewerStage = ({ stageRef, viewer, images, label }) => {
    const { image, index, count, hasImage, view, dragging, fullscreen } = viewer;
    const position = count > 0 ? `${index + 1}/${count}` : null;
    const filter = [viewer.contrast && "contrast(1.6)", viewer.invert && "invert(1)"].filter(Boolean).join(" ") || undefined;

    return (
        <div className="flex flex-col gap-3">
            <div
                ref={stageRef}
                tabIndex={0}
                role="group"
                aria-roledescription="Trình xem ảnh X-quang"
                aria-label={`Ảnh ${label}${position ? ` (${position})` : ""}`}
                {...viewer.stageHandlers}
                className={cx(
                    "relative flex h-75 select-none flex-col items-center justify-center gap-2 overflow-hidden bg-surface-navy outline-none focus-visible:shadow-focus",
                    fullscreen ? "rounded-none" : "rounded-[10px]",
                    hasImage && view.zoom > 1 && "touch-none",
                    hasImage && (view.zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"),
                )}
            >
                {hasImage ? (
                    <img
                        src={image.url}
                        alt={`Ảnh ${label} (${position})`}
                        draggable={false}
                        className={cx("pointer-events-none max-h-full max-w-full object-contain", !dragging && "transition-transform duration-150")}
                        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom}) rotate(${view.rotation}deg)`, filter }}
                    />
                ) : (
                    <>
                        <ImageIcon className="size-10 text-placeholder" aria-hidden="true" />
                        <p className="text-caption font-medium text-placeholder">
                            Ảnh {label}
                            {position && ` (${position})`}
                        </p>
                    </>
                )}

                {hasImage && (
                    <span className={cx(OVERLAY, "num absolute top-3 left-3 text-on-navy")} aria-live="polite">
                        {count > 1 && `${position} · `}
                        {Math.round(view.zoom * 100)}%
                    </span>
                )}
                {hasImage && !fullscreen && (
                    <span className={cx(OVERLAY, "absolute right-3 bottom-3 hidden text-on-navy-soft md:inline")}>Cuộn để phóng to · Kéo để di chuyển</span>
                )}
                {/* The card head with the tools is hidden in full screen: keep a way out on the stage. */}
                {fullscreen && (
                    <button
                        type="button"
                        className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-lg bg-surface-navy/70 text-on-navy outline-none ring-1 ring-white/15 hover:bg-surface-navy focus-visible:shadow-focus"
                        aria-label="Thoát toàn màn hình" title="Thoát toàn màn hình (F)" {...stopStage} onClick={viewer.toggleFullscreen}>
                        <Minimize className="size-4" aria-hidden="true" />
                    </button>
                )}

                {count > 1 && (
                    <>
                        <button type="button" className={cx(NAV, "left-3")} aria-label="Ảnh trước" title="Ảnh trước (←)" {...stopStage} onClick={() => viewer.goTo(index - 1)}>
                            <ChevronLeft className="size-5" aria-hidden="true" />
                        </button>
                        <button type="button" className={cx(NAV, "right-3")} aria-label="Ảnh sau" title="Ảnh sau (→)" {...stopStage} onClick={() => viewer.goTo(index + 1)}>
                            <ChevronRight className="size-5" aria-hidden="true" />
                        </button>
                    </>
                )}
            </div>

            {count > 1 && (
                <div className="flex flex-wrap gap-2.5">
                    {images.map((item, itemIndex) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={`Ảnh ${itemIndex + 1}`}
                            aria-pressed={itemIndex === index}
                            onClick={() => viewer.goTo(itemIndex)}
                            className={cx(
                                "grid h-16 w-24 cursor-pointer place-items-center overflow-hidden rounded-md bg-surface-muted outline-none focus-visible:shadow-focus",
                                itemIndex === index ? "border-2 border-primary" : "border border-border hover:border-border-strong",
                            )}
                        >
                            {item.url ? <img src={item.url} alt="" className="size-full object-cover" /> : <ImageIcon className="size-4.5 text-muted" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default XrayViewerStage;
