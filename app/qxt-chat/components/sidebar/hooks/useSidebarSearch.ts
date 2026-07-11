import { useMemo } from "react";

import type { SessionItem }
    from "../types";

import { safeTitle }
    from "../utils/safeTitle";

export function useSidebarSearch(
    sessions: SessionItem[],
    search: string,
) {
    const query =
        search.trim().toLowerCase();

    return useMemo(() => {
        if (!query) {
            return sessions;
        }

        return sessions.filter((session) => {
            const title =
                safeTitle(session)
                    .toLowerCase();

            return title.includes(query);
        });
    }, [sessions, query]);
}