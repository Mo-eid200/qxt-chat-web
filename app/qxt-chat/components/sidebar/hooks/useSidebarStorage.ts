import { useState, useEffect } from "react";

export function useSidebarStorage<T>(
    key: string,
    initial: T
) {
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = typeof localStorage !== "undefined" && localStorage.getItem(key);
            const parsed = raw ? (JSON.parse(raw) as T) : null;
            return parsed && typeof parsed === "object" ? parsed : initial;
        } catch {
            return initial;
        }
    });

    useEffect(() => {
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch { }
    }, [key, value]);

    return [value, setValue] as const;
}