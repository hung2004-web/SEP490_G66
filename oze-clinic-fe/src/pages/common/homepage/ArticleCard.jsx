import { Image as ImageIcon } from "lucide-react";
import { cx } from "@/utils/cx";

const VARIANTS = {
    featured: {
        card: "flex-col",
        image: "aspect-video w-full lg:aspect-auto lg:min-h-72 lg:flex-1",
        body: "p-6",
        title: "line-clamp-3 text-heading-2",
    },
    compact: {
        card: "flex-row",
        image: "aspect-4/3 w-32 sm:w-40",
        body: "flex-1 items-center p-4",
        title: "card-title line-clamp-3",
    },
};

const ArticleCard = ({ article, variant = "compact", className }) => {
    const styles = VARIANTS[variant];

    return (
        <article className={cx("card-public flex overflow-hidden p-0", styles.card, className)}>
            <div className={cx("relative shrink-0 bg-surface-muted", styles.image)}>
                {article.imageUrl ? (
                    <img src={article.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                ) : (
                    <ImageIcon
                        className="absolute top-1/2 left-1/2 size-8 -translate-1/2 text-placeholder"
                        aria-hidden="true"
                    />
                )}
            </div>
            <div className={cx("flex min-w-0", styles.body)}>
                <h3 className={styles.title}>{article.title}</h3>
            </div>
        </article>
    );
};

export default ArticleCard;
