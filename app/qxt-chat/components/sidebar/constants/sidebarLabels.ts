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

  const isAgent =
    environment === "agent";

  return {
    ...commonLabels,

    newChat: isAgent
      ? "New agent chat"
      : isWorkspace
        ? "New workspace chat"
        : "New chat",

    newChatInProject: isAgent
      ? "New agent conversation"
      : "New chat in project",

    signInHint:
      "Sign in to sync your AI environment",

    yourAccount: isAgent
      ? "Agent runtime session"
      : isWorkspace
        ? "Workspace account"
        : "Your ChatQXT account",

    noSessions: isAgent
      ? "No agent conversations yet."
      : "No conversations yet.",

    signInToView:
      "Sign in to access chats.",

    workspace: isAgent
      ? "Agent Workspace"
      : isWorkspace
        ? "Team Workspace"
        : "Personal Workspace",

    chats: isAgent
      ? "Agent Chats"
      : isWorkspace
        ? "Workspace Chats"
        : "Chats",

    projects: isAgent
      ? "Agent Resources"
      : isWorkspace
        ? "Team Projects"
        : "Projects",

    library: isAgent
      ? "Knowledge"
      : "Library",

    code: isAgent
      ? "Agent Code"
      : "QXT Code",

    newProject: isAgent
      ? "New resource"
      : "New project",

    vision: "QXT Vision",

    coming:
      "OpenQCore AI Ecosystem",

    comingDesc:
      "Explore AI products, tools, agents, and enterprise systems powered by OpenQCore.",

    chatsSearch: isAgent
      ? "Search agent conversations"
      : "Search conversations",

    searchPlaceholder: isAgent
      ? "Search agent chats..."
      : "Search chats...",

    noProjects: isAgent
      ? "No resources yet."
      : "No projects yet.",

    projectNamePlaceholder: isAgent
      ? "Resource name..."
      : "Project name...",

    createHint:
      "Press Enter to create — Esc to cancel",
  };
}