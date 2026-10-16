const ACCESS_TOKEN_KEY = "accessToken";
const USER_NAME_KEY = "userFullName";
const USER_ROLE_KEY = "userRole";
const SESSION_KEYS = [ACCESS_TOKEN_KEY, USER_NAME_KEY, USER_ROLE_KEY];

const listeners = new Set();

const notify = () => {
    [...listeners].forEach((listener) => {
        try {
            listener();
        } catch (error) {
            console.error(error);
        }
    });
};

const writeItem = (key, value) => {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
};

export const getSessionToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getSessionUserName = () => localStorage.getItem(USER_NAME_KEY);

export const getSessionRole = () => localStorage.getItem(USER_ROLE_KEY);

export const clearSession = () => {
    if (SESSION_KEYS.every((key) => localStorage.getItem(key) === null)) return;
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    notify();
};

export const saveSession = ({ token, userName, role }) => {
    if (!token) {
        clearSession();
        return;
    }
    writeItem(USER_NAME_KEY, userName);
    writeItem(USER_ROLE_KEY, role);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    notify();
};

export const subscribeToSession = (onChange) => {
    const listener = () => onChange();
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
};
