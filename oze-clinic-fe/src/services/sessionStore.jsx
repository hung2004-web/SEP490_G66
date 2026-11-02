import { BACKEND_ROLE_NAMES } from "../utils/messages";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_NAME_KEY = "userFullName";
const USER_ROLE_KEY = "userRole";
const SESSION_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_NAME_KEY, USER_ROLE_KEY];
const ROLE_CLAIMS = ["role", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
const EXPIRY_MARGIN_SECONDS = 30;

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

export const getSessionRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const getSessionUserName = () => localStorage.getItem(USER_NAME_KEY);

export const getSessionRole = () => localStorage.getItem(USER_ROLE_KEY);

export const clearSession = () => {
    if (SESSION_KEYS.every((key) => localStorage.getItem(key) === null)) return;
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    notify();
};

export const saveSession = ({ token, refreshToken, userName, role }) => {
    if (!token) {
        clearSession();
        return;
    }
    writeItem(REFRESH_TOKEN_KEY, refreshToken);
    writeItem(USER_NAME_KEY, userName);
    writeItem(USER_ROLE_KEY, role);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    notify();
};

// After the user edits their own profile, so the header shows the new name.
export const updateSessionUserName = (userName) => {
    if (!getSessionToken()) return;
    writeItem(USER_NAME_KEY, userName);
    notify();
};

const decodeClaims = (token) => {
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
        const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
        const claims = JSON.parse(new TextDecoder("utf-8").decode(bytes));
        return claims !== null && typeof claims === "object" ? claims : null;
    } catch {
        return null;
    }
};

const roleFromClaims = (claims) => {
    for (const claimName of ROLE_CLAIMS) {
        for (const value of [claims[claimName]].flat()) {
            const role = Object.keys(BACKEND_ROLE_NAMES).find((key) => BACKEND_ROLE_NAMES[key] === value);
            if (role) return role;
        }
    }
    return undefined;
};

export const sessionFromAuthResult = (data) => {
    if (typeof data?.token !== "string" || typeof data?.refreshToken !== "string" || !data.token || !data.refreshToken) return null;
    const claims = decodeClaims(data.token);
    const role = claims ? roleFromClaims(claims) : undefined;
    if (!role) return null;
    const userName = typeof claims.FullName === "string" ? claims.FullName : undefined;
    return { token: data.token, refreshToken: data.refreshToken, userName, role };
};

export const isSameSessionUser = (firstToken, secondToken) => {
    const first = typeof firstToken === "string" ? decodeClaims(firstToken)?.sub : undefined;
    const second = typeof secondToken === "string" ? decodeClaims(secondToken)?.sub : undefined;
    return typeof first === "string" && first !== "" && first === second;
};

export const isAccessTokenExpired = (token) => {
    const exp = typeof token === "string" ? decodeClaims(token)?.exp : undefined;
    if (!Number.isFinite(exp)) return true;
    return Date.now() >= (exp - EXPIRY_MARGIN_SECONDS) * 1000;
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
