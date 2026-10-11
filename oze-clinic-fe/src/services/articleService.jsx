import { ARTICLE_CATEGORIES, MOCK_ARTICLES } from "../utils/mockArticles";

const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getKnowledgeArticles = async () => {
    await wait(MOCK_DELAY_MS);

    return { success: true, message: null, data: { categories: ARTICLE_CATEGORIES, articles: MOCK_ARTICLES }, errors: null };
};
