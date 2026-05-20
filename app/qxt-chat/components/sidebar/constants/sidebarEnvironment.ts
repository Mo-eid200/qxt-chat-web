export type SidebarEnvironment =
    | "personal"
    | "workspace";

export type SidebarEnvironmentConfig = {
    id: SidebarEnvironment;

    label: string;

    description: string;

    accent:
    | "emerald"
    | "cyan"
    | "violet"
    | "sky";

    sidebarBackground: string;

    activeRail: string;

    hoverSurface: string;
};

export const SIDEBAR_ENVIRONMENTS: Record<
    SidebarEnvironment,
    SidebarEnvironmentConfig
> = {
    personal: {
        id: "personal",

        label: "Personal",

        description:
            "Your personal AI workspace",

        accent: "emerald",

        sidebarBackground:
            "bg-[#0B0F14]/92",

        activeRail:
            "before:bg-emerald-400",

        hoverSurface:
            "hover:bg-white/[0.04]",
    },

    workspace: {
        id: "workspace",

        label: "Workspace",

        description:
            "Team AI operations environment",

        accent: "cyan",

        sidebarBackground:
            "bg-[#0B1020]/92",

        activeRail:
            "before:bg-cyan-400",

        hoverSurface:
            "hover:bg-cyan-400/[0.06]",
    },
};

export function isWorkspaceEnvironment(
    environment: SidebarEnvironment
) {
    return environment === "workspace";
}