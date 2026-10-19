import { MOCK_NOTIFICATIONS } from "../utils/data/mockNotifications";

const MOCK_DELAY_MS = 300;

export const NOTIFICATION_PAGE_SIZE = 20;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data) => ({ success: true, message: null, data, errors: null });

const notifications = MOCK_NOTIFICATIONS.map((notification) => ({ ...notification })).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
);

const countUnread = () => notifications.filter((notification) => !notification.isRead).length;

export const getNotifications = async ({ page = 1, pageSize = NOTIFICATION_PAGE_SIZE } = {}) => {
    await wait(MOCK_DELAY_MS);

    const totalItems = notifications.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = notifications.slice(start, start + pageSize).map((notification) => ({ ...notification }));

    return success({ items, page: currentPage, pageSize, totalItems, totalPages, unreadCount: countUnread() });
};

export const markNotificationAsRead = async (id) => {
    await wait(MOCK_DELAY_MS);

    const notification = notifications.find((item) => item.id === id);
    if (notification) notification.isRead = true;

    return success({ unreadCount: countUnread() });
};

export const markAllNotificationsAsRead = async () => {
    await wait(MOCK_DELAY_MS);

    notifications.forEach((notification) => {
        notification.isRead = true;
    });

    return success({ unreadCount: 0 });
};

export const getUnreadNotificationCount = async () => {
    await wait(MOCK_DELAY_MS);

    return success({ unreadCount: countUnread() });
};
