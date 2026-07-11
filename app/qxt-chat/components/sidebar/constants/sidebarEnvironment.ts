export type SidebarEnvironment =
  | "personal"
  | "workspace"
  | "agent";

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

  agent: {
    id: "agent",
    label: "Agent",
    description:
      "Dedicated agent runtime environment",
    accent: "violet",
    sidebarBackground:
      "bg-[#100B18]/92",
    activeRail:
      "before:bg-violet-400",
    hoverSurface:
      "hover:bg-violet-400/[0.08]",
  },
};

export function isWorkspaceEnvironment(
  environment: SidebarEnvironment
) {
  return environment === "workspace";
}

export function isAgentEnvironment(
  environment: SidebarEnvironment
) {
  return environment === "agent";
}

export function isPersonalEnvironment(
  environment: SidebarEnvironment
) {
  return environment === "personal";
}