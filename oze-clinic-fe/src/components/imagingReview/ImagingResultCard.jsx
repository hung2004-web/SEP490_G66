import { useState } from "react";
import { Contrast, Image as ImageIcon, RotateCw, ZoomIn } from "lucide-react";
import { cx } from "@/utils/cx";

const ZOOM_STEPS = [1, 1.5, 2];
const TOOL_BUTTON = "btn btn-secondary btn-icon size-[34px] rounded-md p-0";

// X-ray result being reviewed: viewer with zoom / contrast / rotate and the thumbnails.
// title: "X-quang toàn cảnh · YC000318"; subtitle: "Chỉ định 08:40 · Chụp xong 08:58 bởi KTV. …";
// typeLabel: "X-quang toàn cảnh" (placeholder text); images: [{ id, url? }]. Without url a placeholder is shown.
const ImagingResultCard = ({ title, subtitle, typeLabel, images = [] }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [zoomStep, setZoomStep] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [highContrast, setHighContrast] = useState(false);

    const active = images[activeIndex];
    const hasImage = Boolean(active?.url);

    const selectImage = (index) => {
        setActiveIndex(index);
        setZoomStep(0);
        setRotation(0);
    };

    return (
        <section className="card-app overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-body-md font-semibold text-ink">{title}</h3>
                    {subtitle && <p className="text-caption text-muted">{subtitle}</p>}
                </div>
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        className={TOOL_BUTTON}
                        aria-label="Phóng to"
                        title="Phóng to"
                        disabled={!hasImage}
                        onClick={() => setZoomStep((step) => (step + 1) % ZOOM_STEPS.length)}
                    >
                        <ZoomIn className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={TOOL_BUTTON}
                        aria-label="Tương phản"
                        title="Tương phản"
                        aria-pressed={highContrast}
                        disabled={!hasImage}
                        onClick={() => setHighContrast((on) => !on)}
                    >
                        <Contrast className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={TOOL_BUTTON}
                        aria-label="Xoay"
                        title="Xoay"
                        disabled={!hasImage}
                        onClick={() => setRotation((deg) => (deg + 90) % 360)}
                    >
                        <RotateCw className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-3 px-5 pt-4 pb-5">
                <div className="flex h-75 flex-col items-center justify-center gap-2 overflow-hidden rounded-[10px] bg-surface-navy">
                    {hasImage ? (
                        <img
                            src={active.url}
                            alt={`Ảnh ${typeLabel} (${activeIndex + 1}/${images.length})`}
                            className="max-h-full max-w-full object-contain transition-transform duration-200"
                            style={{
                                transform: `scale(${ZOOM_STEPS[zoomStep]}) rotate(${rotation}deg)`,
                                filter: highContrast ? "contrast(1.6)" : undefined,
                            }}
                        />
                    ) : (
                        <>
                            <ImageIcon className="size-10 text-placeholder" aria-hidden="true" />
                            <p className="text-caption font-medium text-placeholder">
                                Ảnh {typeLabel}
                                {images.length > 0 && ` (${activeIndex + 1}/${images.length})`}
                            </p>
                        </>
                    )}
                </div>
                {images.length > 1 && (
                    <div className="flex flex-wrap gap-2.5">
                        {images.map((image, index) => (
                            <button
                                key={image.id}
                                type="button"
                                aria-label={`Ảnh ${index + 1}`}
                                aria-pressed={index === activeIndex}
                                onClick={() => selectImage(index)}
                                className={cx(
                                    "grid h-16 w-24 cursor-pointer place-items-center overflow-hidden rounded-md bg-surface-muted outline-none focus-visible:shadow-focus",
                                    index === activeIndex ? "border-2 border-primary" : "border border-border hover:border-border-strong",
                                )}
                            >
                                {image.url ? (
                                    <img src={image.url} alt="" className="size-full object-cover" />
                                ) : (
                                    <ImageIcon className="size-4.5 text-muted" aria-hidden="true" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ImagingResultCard;
