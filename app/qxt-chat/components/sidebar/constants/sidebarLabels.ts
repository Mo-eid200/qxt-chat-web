import type {
    SidebarEnvironment,
} from "./sidebarEnvironment";

const commonLabels = {
    search: "Search",

    clear: "Clear",

    rename: "Rename",

    delete: "Delete",

    create: "Create",

    cancel: "Cancel",

    open: "Open",

    options: "Options",

    collapse: "Collapse",

    expand: "Expand",

    busy: "Updating...",

    noResults: "No results.",

    copyLink: "Copy chat link",

    drag: "Drag to reorder",

    dropToMove:
        "Drop here to move chat",
};

export function getSidebarLabels(
    environment: SidebarEnvironment
) {
    const isWorkspace =
        environment === "workspace";

    return {
        ...commonLabels,

        newChat: isWorkspace
            ? "New workspace chat"
            : "New chat",

        newChatInProject:
            "New chat in project",

        signInHint:
            "Sign in to sync your AI environment",

        yourAccount: isWorkspace
            ? "Workspace account"
            : "Your ChatQXT account",

        noSessions:
            "No conversations yet.",

        signInToView:
            "Sign in to access chats.",

        workspace: isWorkspace
            ? "Team Workspace"
            : "Personal Workspace",

        chats: isWorkspace
            ? "Workspace Chats"
            : "Chats",

        projects: isWorkspace
            ? "Team Projects"
            : "Projects",

        library: "Library",

        code: "QXT Code",

        newProject:
            "New project",

        vision: "QXT Vision",

        coming:
            "OpenQCore AI Ecosystem",

        comingDesc:
            "Explore AI products, tools, agents, and enterprise systems powered by OpenQCore.",

        chatsSearch:
            "Search conversations",

        searchPlaceholder:
            "Search chats...",

        noProjects:
            "No projects yet.",

        projectNamePlaceholder:
            "Project name...",

        createHint:
            "Press Enter to create — Esc to cancel",
    };
}