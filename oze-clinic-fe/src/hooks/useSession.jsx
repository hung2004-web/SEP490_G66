import { useSyncExternalStore } from "react";
import { getSessionRole, getSessionToken, getSessionUserName, subscribeToSession } from "@/services/authService";

export default function useSession() {
    const token = useSyncExternalStore(subscribeToSession, getSessionToken);
    const userName = useSyncExternalStore(subscribeToSession, getSessionUserName);
    const role = useSyncExternalStore(subscribeToSession, getSessionRole);

    return { token, userName, role };
}
