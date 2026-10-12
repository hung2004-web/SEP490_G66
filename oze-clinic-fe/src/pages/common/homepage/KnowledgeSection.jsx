import { useRef, useState } from "react";
import { Inbox } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import useAsync from "@/hooks/useAsync";
import { getKnowledgeArticles } from "@/services/articleService";
import { cx } from "@/utils/cx";
import ArticleCard from "./ArticleCard.jsx";

const TITLE_ID = "home-knowledge-title";
const PANEL_ID = "home-knowledge-panel";

const COMPACT_COUNT = 3;

const tabId = (categoryId) => `home-knowledge-tab-${categoryId}`;

const KnowledgeSection = () => {
    const { loading, value } = useAsync(getKnowledgeArticles, []);
    const categories = value?.success ? value.data.categories : [];
    const articles = value?.success ? value.data.articles : [];
    const [selectedId, setSelectedId] = useState(null);
    const tabRefs = useRef({});
    const selected = categories.find((category) => category.id === selectedId) ?? categories[0];
    const [featured, ...others] = articles.filter((article) => article.categoryId === selected?.id);
    const compact = others.slice(0, COMPACT_COUNT);

    const selectTab = (index) => {
        const category = categories[(index + categories.length) % categories.length];
        setSelectedId(category.id);
        tabRefs.current[category.id]?.focus();
    };

    const handleKeyDown = (event, index) => {
        const targets = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: categories.length - 1,
        };
        if (!(event.key in targets)) return;
        event.preventDefault();
        selectTab(targets[event.key]);
    };

    return (
        <section
            aria-labelledby={TITLE_ID}
            aria-busy={loading || undefined}
            className="container-public flex flex-col gap-10 py-12 md:py-16"
        >
            <SectionHeading id={TITLE_ID}>Kiến thức nha khoa</SectionHeading>
            {loading && (
                <div className="flex flex-col gap-8" aria-hidden="true">
                    <div className="flex flex-wrap justify-center gap-3">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div key={index} className="skeleton h-control w-28 rounded-full" />
                        ))}
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="skeleton aspect-video w-full rounded-xl lg:aspect-auto" />
                        <div className="flex flex-col gap-6">
                            {Array.from({ length: COMPACT_COUNT }, (_, index) => (
                                <div key={index} className="skeleton h-30 rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {!loading && categories.length === 0 && (
                <div className="empty-state">
                    <Inbox className="empty-state-icon" aria-hidden="true" />
                    <p className="empty-state-title">Chưa có bài viết nào.</p>
                </div>
            )}
            {!loading && categories.length > 0 && (
                <div className="flex flex-col gap-8">
                    <div role="tablist" aria-labelledby={TITLE_ID} className="flex flex-wrap justify-center gap-3">
                        {categories.map((category, index) => {
                            const isSelected = category.id === selected.id;
                            return (
                                <button
                                    key={category.id}
                                    ref={(node) => {
                                        tabRefs.current[category.id] = node;
                                    }}
                                    id={tabId(category.id)}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    aria-controls={PANEL_ID}
                                    tabIndex={isSelected ? 0 : -1}
                                    onClick={() => setSelectedId(category.id)}
                                    onKeyDown={(event) => handleKeyDown(event, index)}
                                    className={cx(
                                        "btn rounded-full px-5",
                                        isSelected ? "bg-primary text-on-primary hover:bg-primary-hover" : "btn-secondary",
                                    )}
                                >
                                    {category.label}
                                </button>
                            );
                        })}
                    </div>
                    <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(selected.id)} tabIndex={0}>
                        {featured ? (
                            <div className="grid gap-6 lg:grid-cols-2">
                                <ArticleCard article={featured} variant="featured" />
                                {compact.length > 0 && (
                                    <ul className="flex flex-col gap-6">
                                        {compact.map((article) => (
                                            <li key={article.id} className="flex lg:flex-1">
                                                <ArticleCard article={article} className="w-full" />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Inbox className="empty-state-icon" aria-hidden="true" />
                                <p className="empty-state-title">Chưa có bài viết nào.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default KnowledgeSection;
