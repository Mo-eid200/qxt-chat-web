import type { SessionItem }
    from "../types";

export function safeTitle(
    session: SessionItem
) {
    return (
        session.title?.trim() ||
        "Untitled Chat"
    );
}