import { Image as ImageIcon } from "lucide-react";
import { cx } from "@/utils/cx";

const RATIOS = {
    square: "aspect-square",
    portrait: "aspect-2/3",
    video: "aspect-video",
};

const FITS = {
    contain: "object-contain",
    cover: "object-cover",
};

const ImageCard = ({
    imageUrl,
    imageAlt,
    ratio = "square",
    fit = "cover",
    imagePosition,
    imageBackground = "bg-surface-tint",
    label,
    title,
    description,
    orientation = "vertical",
    titleClassName = "card-title",
    className,
}) => {
    const horizontal = orientation === "horizontal";

    return (
        <article
            className={cx(
                "card-public flex overflow-hidden p-0",
                horizontal ? "flex-row items-center gap-4" : "flex-col",
                className,
            )}
        >
            <div className={cx("shrink-0", RATIOS[ratio], imageBackground, horizontal ? "w-32 sm:w-40" : "w-full")}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={imageAlt}
                        loading="lazy"
                        className={cx("size-full", FITS[fit], imagePosition)}
                    />
                ) : (
                    <div className="flex size-full items-center justify-center bg-surface-muted">
                        <ImageIcon className="size-8 text-placeholder" aria-hidden="true" />
                    </div>
                )}
            </div>
            <div className={cx("flex min-w-0 flex-1 flex-col gap-2", horizontal ? "py-3 pr-4" : "p-4")}>
                {label && <span className="badge badge-info self-start">{label}</span>}
                <h3 className={titleClassName}>{title}</h3>
                {description && <p className="line-clamp-3 text-body-sm text-body">{description}</p>}
            </div>
        </article>
    );
};

export default ImageCard;
