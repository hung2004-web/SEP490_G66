import { Image as ImageIcon } from "lucide-react";
import { cx } from "@/utils/cx";

const ImageCard = ({ imageUrl, imageAlt, title, description, className }) => {
    return (
        <article className={cx("card-public flex flex-col overflow-hidden p-0", className)}>
            <div className="aspect-square w-full shrink-0 bg-surface-tint">
                {imageUrl ? (
                    <img src={imageUrl} alt={imageAlt} loading="lazy" className="size-full object-contain" />
                ) : (
                    <div className="flex size-full items-center justify-center bg-surface-muted">
                        <ImageIcon className="size-8 text-placeholder" aria-hidden="true" />
                    </div>
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                <h3 className="card-title">{title}</h3>
                {description && <p className="line-clamp-3 text-body-sm text-body">{description}</p>}
            </div>
        </article>
    );
};

export default ImageCard;
