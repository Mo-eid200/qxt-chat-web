"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Folder,
  FolderOpen,
  MessageSquarePlus,
  ChevronRight,
  Plus,
  Users,
} from "lucide-react";
import { cn } from "../sidebar/utils/cn";

import { SidebarProvider } from "../sidebar/constants/SidebarContext";
import { getSidebarLabels } from "../sidebar/constants/sidebarLabels";
import { getSidebarStyles } from "../sidebar/constants/sidebarStyles";
import WorkspaceSwitcherSection from "./sections/WorkspaceSwitcherSection";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { MembersSection } from "./sections/MembersSection";

import {
  LS_ORDER_MAP,
  LS_FOLDERS_OPEN,
  LS_PROJECT_FOLDERS_OPEN,
} from "../sidebar/constants/storageKeys";

import { useSidebarDnD } from "../sidebar/hooks/useSidebarDnD";
import { useSidebarStorage } from "../sidebar/hooks/useSidebarStorage";

import { SidebarHeader } from "./layout/SidebarHeader";
import { SidebarFooter } from "./layout/SidebarFooter";

import { ChatsSection } from "./sections/ChatsSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { PersonalUpgradeModal } from "../PersonalUpgradeModal";
import { WorkspaceUpgradeModal } from "../WorkspaceUpgradeModal";

import type { SessionItem, ProjectFolder, VisionKey } from "../sidebar/types";

import type { BusinessMeResponse } from "../../../types/business";
import type { SidebarEnvironment } from "../sidebar/constants/sidebarEnvironment";

import { useBilling } from "../../../hooks/useBilling";
import { getStoredContext } from "../../../lib/api/core/qxtClient";

import { useState, useEffect } from "react";
import { qxtApiClient } from "../../../lib/api/core/qxtClient";
import { useAgentRuntime } from "../../../context/AgentRuntimeContext";


const LS_ENVIRONMENT = "qxt_environment";
export type ChatSidebarProps = {
  darkMode: boolean;
  open: boolean;
  businessState?: BusinessMeResponse | null;
  businessLoading?: boolean;
  onToggleThemeAction: () => void;
  onNewChatAction: () => void;
  onNewChatInFolderAction?: (folderId: string | null) => void;
  onCloseAction?: () => void;
  isLoggedIn: boolean;
  userName?: string | null;
  userEmail?: string | null;
  onAccountClickAction?: () => void;
  onLogoutAction?: () => void;
  sessions?: SessionItem[];
  unfiledSessions?: SessionItem[];
  activeSessionId?: string | null;
  onOpenSessionAction?: (sid: string) => void;
  onDeleteSessionAction?: (sid: string) => void;
  onRenameSessionAction?: (sid: string) => void;
  onCopySessionLinkAction?: (sid: string) => void;
  onTogglePinAction?: (sid: string) => void;
  onToggleStarAction?: (sid: string) => void;
  onToggleUnreadAction?: (sid: string) => void;
  onOpenVisionAction?: (key: VisionKey) => void;
  projectFolders?: ProjectFolder[];
  onCreateProjectFolderAction?: (title: string) => void;
  onMoveSessionToFolderAction?: (sid: string, folderId: string | null) => void;
  onReorderFolderSessionsAction?: (folderId: string | null, orderedIds: string[]) => void;
  workspaceBusy?: boolean;
  onRenameProjectFolderAction?: (folderId: string, currentTitle: string) => void;
  onDeleteProjectFolderAction?: (folderId: string) => void;
};

type SidebarSection = "chats" | "projects" | "agents" | "members";

function filterSessionsBySearch(sessions: SessionItem[], query: string): SessionItem[] {
  const q = query.trim().toLowerCase();

  if (!q) {
    return sessions;
  }

  return sessions.filter((session) => String(session.title || "").toLowerCase().includes(q));
}

function resolveEnvironmentFromRuntime(): SidebarEnvironment {
  const runtime = getStoredContext();
  return runtime.spaceType === "workspace" ? "workspace" : "personal";
}

function ScopeButton({
  icon,
  title,
  subtitle,
  active,
  darkMode,
  tone,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  active: boolean;
  darkMode: boolean;
  tone: "chat" | "project" | "agent" | "members";
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  // Unified color system: matches openqcore-web (amber = personal
  // scope, red = workspace scope). "agent" keeps a distinct violet
  // accent since agent-linked chats are a third, separate context.
  // Single dark theme only — no more per-tone emerald/indigo/cyan
  // branches, no more darkMode ternary.
  const toneClass =
    tone === "agent"
      ? active
        ? "border-violet-400/20 bg-violet-500/[0.09] text-violet-100"
        : "border-white/[0.06] bg-white/[0.03] text-white/88 hover:bg-white/[0.05]"
      : active
        ? "border-amber-300/20 bg-amber-300/[0.09] text-amber-100"
        : "border-white/[0.06] bg-white/[0.03] text-white/88 hover:bg-white/[0.05]";

  const iconToneClass =
    tone === "agent" ? "bg-violet-400/[0.14] text-violet-200" : "bg-amber-300/[0.14] text-amber-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex h-9 items-center gap-2 rounded-lg px-2.5 border transition-all duration-200 text-left",
        toneClass
      )}
    >
      <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", iconToneClass)}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-5 truncate">{title}</div>

        {subtitle ? (
          <div className={cn("text-[11px]", darkMode ? "text-white/42" : "text-slate-500")}>{subtitle}</div>
        ) : null}
      </div>

      {trailing}
    </button>
  );
}

function AgentsSection({
  darkMode,
  open,
  setOpen,
  active,
  onActivate,
}: {
  darkMode: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  active: boolean;
  onActivate: (isActive: boolean) => void;
}) {
  // NOTE: onActivate() sets the parent's activeSection to "agents",
  // which is what makes the bottom panel's header switch from
  // "Chats" to "Agent chats". Without calling it here (only calling
  // setActiveAgentId), the session list below already refreshes to
  // the agent's own sessions (that part was already wired), but the
  // header label stayed on "Chats" — making it look like nothing
  // happened even though it had.
  const { activeAgentId, setActiveAgentId, clearActiveAgent } = useAgentRuntime();
  const [agents, setAgents] = useState<{ id: string; name: string; icon?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { activeWorkspace } = useWorkspace();

  // ── Load agents when section opens (scoped to the active workspace,
  // or personal console agents when no workspace is active) ─────────
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const url = activeWorkspace?.id
          ? `/api/v1/workspaces/${activeWorkspace.id}/agents`
          : "/api/v1/console/agents/";
        const { data } = await qxtApiClient.get(url, { params: { limit: 20, offset: 0 } });
        const items = Array.isArray(data?.items) ? data.items : [];
        if (mounted) {
          setAgents(items.map((a: any) => ({ id: String(a.id), name: String(a.name || ""), icon: a.icon || "cpu" })));
        }
      } catch {
        if (mounted) setAgents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, activeWorkspace?.id]);

  return (
    <div className="space-y-1">
      <ScopeButton
        icon={<Bot className="w-4 h-4" />}
        title="Agents"
        active={active}
        darkMode={darkMode}
        tone="agent"
        onClick={() => setOpen((p) => !p)}
        trailing={
          <ChevronRight
            className={`w-4 h-4 opacity-70 transition-transform duration-200 ${open ? "rotate-90" : "rotate-0"}`}
          />
        }
      />

      {open && (
        <div
          className={cn(
            "ml-4 border-l pl-3 py-1 space-y-0.5",
            darkMode ? "border-white/[0.06]" : "border-black/[0.06]"
          )}
        >
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-xl bg-white/[0.03] animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))
          ) : agents.length === 0 ? (
            <p className={cn("text-[11px] px-2 py-1", darkMode ? "text-white/30" : "text-slate-400")}>
              No agents yet
            </p>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  if (activeAgentId === agent.id) {
                    // Clicking the already-active agent exits agent scope.
                    clearActiveAgent();
                    onActivate(false);
                    return;
                  }

                  setActiveAgentId(agent.id, agent.name);
                  onActivate(true);
                }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all duration-150 text-[12px]",
                  activeAgentId === agent.id
                    ? darkMode
                      ? "bg-violet-500/[0.12] border border-violet-400/20 text-violet-100"
                      : "bg-violet-50 border border-violet-200 text-violet-800"
                    : darkMode
                      ? "text-white/60 hover:bg-white/[0.04] hover:text-white/85"
                      : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-900"
                )}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold",
                    darkMode ? "bg-violet-400/[0.12] text-violet-300" : "bg-violet-100 text-violet-700"
                  )}
                >
                  {agent.name[0]?.toUpperCase() || "A"}
                </div>
                <span className="truncate font-medium">{agent.name}</span>
                {activeAgentId === agent.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatSidebar(props: ChatSidebarProps) {
  const router = useRouter();
  const billing = useBilling();

  const [collapsed, setCollapsed] = React.useState(false);
  const [environment, setEnvironment] =
  React.useState<SidebarEnvironment>("personal");

React.useEffect(() => {
  const stored =
    window.localStorage.getItem(
      LS_ENVIRONMENT
    );

  if (
    stored === "personal" ||
    stored === "workspace"
  ) {
    setEnvironment(stored);
    return;
  }

  setEnvironment(
    resolveEnvironmentFromRuntime()
  );
}, []);
  const [activeSection, setActiveSection] = React.useState<SidebarSection>("chats");
  const [agentsOpen, setAgentsOpen] = React.useState(false);
  const [projectsPanelOpen, setProjectsPanelOpen] = React.useState(false);
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [search, setSearch] =
  React.useState("");

const [searchOpen, setSearchOpen] =
  React.useState(false);

  const [menu, setMenu] = React.useState<
  | null
  | { type: "session"; sid: string }
  | { type: "search" }
>(null);

  // Global click-outside handler for the session "..." menu. This was
  // previously entirely missing — sessionMenuRef existed but nothing
  // ever watched for outside clicks to close the menu. Node.contains()
  // works correctly here even though the menu itself now renders via
  // a React Portal (see SessionRow.tsx / ChatsSection.tsx), since
  // contains() checks the real DOM tree, not the React tree — portals
  // only change where a node is rendered, not React's component tree.
  React.useEffect(() => {
    if (!menu) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(target)) {
        setMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menu]);

  const [copiedSid, setCopiedSid] = React.useState<string | null>(null);
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [projectDraft, setProjectDraft] = React.useState("");
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);


  const handleEnvironmentChange =
  React.useCallback(
    (env: SidebarEnvironment) => {
      setEnvironment(env);

      setActiveSection("chats");
      setSelectedProjectId(null);
      setMenu(null);
      setCopiedSid(null);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          LS_ENVIRONMENT,
          env
        );
      }

      if (typeof document !== "undefined") {
        document.documentElement.setAttribute(
          "data-scope",
          env
        );
      }

      // IMPORTANT:
      // Do NOT router.refresh() here.
      // Runtime/context + React Query own
      // the actual scope data.
    },
    []
  );

  const runtime = React.useMemo(() => getStoredContext(), [environment]);

  // Ensures the site-wide color scope (html[data-scope]) matches
  // whatever environment was last active on page load/refresh — not
  // just when the user actively clicks Personal/Workspace during this
  // session. Without this, reloading the page while in Workspace mode
  // would leave the whole app themed as Personal (amber) until the
  // user manually toggled it once.
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-scope", environment);
    }
  }, [environment]);

  // Live, always-current agent id — do NOT recompute this from the
  // environment-scoped `runtime` memo above; that only refreshes when
  // `environment` changes, so it goes stale the instant the user picks
  // a different agent without switching Personal/Workspace. Every
  // place that needs "is an agent active right now" (the panel header
  // label, currentSessions, etc.) must read from this hook instead.
  const { activeAgentId: runtimeAgentId, activeAgentName: runtimeAgentName, clearActiveAgent } = useAgentRuntime();

  const handleGeneralNewChat = React.useCallback(() => {
    if (runtimeAgentId) {
      clearActiveAgent();
    }

    setActiveSection("chats");
    setSelectedProjectId(null);
    setMenu(null);

    props.onNewChatAction();
  }, [runtimeAgentId, clearActiveAgent, props.onNewChatAction]);

  const collapsedActiveClass = environment === "workspace" ? "bg-red-500 text-white" : "bg-amber-400 text-black";

  const labels = getSidebarLabels(environment);
  const styles = getSidebarStyles(props.darkMode, props.open, environment);
  const dnd = useSidebarDnD();
  const { workspaces } = useWorkspace();

  const [sectionsOpen, setSectionsOpen] = useSidebarStorage<Record<string, boolean>>(LS_FOLDERS_OPEN, {
    root: true,
    projects: true,
    library: true,
    code: true,
    vision: true,
  });

  const [projectOpen, setProjectOpen] = useSidebarStorage<Record<string, boolean>>(LS_PROJECT_FOLDERS_OPEN, {});
  const [orderMap] = useSidebarStorage<Record<string, string[]>>(LS_ORDER_MAP, {});

  const openCreateProject = React.useCallback(() => {
    setActiveSection("projects");
    setCreatingProject(true);
    setSectionsOpen((prev) => ({ ...prev, projects: true }));
    setProjectsPanelOpen(true);
  }, [setSectionsOpen]);

  const closeCreateProject = React.useCallback(() => {
    setCreatingProject(false);
    setProjectDraft("");
  }, []);

  const submitCreateProject = React.useCallback(() => {
    const title = projectDraft.trim();

    if (!title) {
      return;
    }

    props.onCreateProjectFolderAction?.(title);

    setActiveSection("projects");
    setCreatingProject(false);
    setProjectDraft("");
    setSectionsOpen((prev) => ({ ...prev, projects: true }));
    setProjectsPanelOpen(true);
  }, [projectDraft, props.onCreateProjectFolderAction, setSectionsOpen]);

  // 🔥 FIX: when an agent is active, always prefer `props.sessions`
  // (fetched via GET /sessions?agent_id=..., always correctly scoped —
  // see app/lib/api/chat/sessions.ts's buildSessionParams(), which
  // reads the live stored context on every call) over
  // `props.unfiledSessions` (workspaceTree.unfiled). The workspace
  // tree is a separate personal/workspace-folder concept that agent
  // chats don't participate in, and prioritizing it here is what
  // caused the previously-fixed stale-ref bug to leak the general
  // chat list into the agent view even after that fix.
  const rootSessions = runtimeAgentId ? props.sessions ?? [] : props.unfiledSessions ?? [];

  const filteredRootSessions = React.useMemo(
    () => filterSessionsBySearch(rootSessions, search),
    [rootSessions, search]
  );

  const orderedRootSessions = React.useMemo(() => {
    const ids = orderMap["__root__"] || [];
    const map = new Map(filteredRootSessions.map((s) => [s.id, s]));
    const ordered = ids.map((id) => map.get(id)).filter(Boolean) as SessionItem[];
    const rest = filteredRootSessions.filter((s) => !ids.includes(s.id));

    return [...ordered, ...rest];
  }, [filteredRootSessions, orderMap]);

  const projectsWithLists = React.useMemo(() => {
    return (props.projectFolders ?? []).map((folder) => {
      const rawChats = Array.isArray(folder.chats) ? folder.chats : [];
      const filteredChats = filterSessionsBySearch(rawChats, search);
      const ids = orderMap[folder.id] || [];
      const map = new Map(filteredChats.map((s) => [s.id, s]));
      const ordered = ids.map((id) => map.get(id)).filter(Boolean) as SessionItem[];
      const rest = filteredChats.filter((s) => !ids.includes(s.id));

      return {
        ...folder,
        chats: [...ordered, ...rest],
      };
    });
  }, [props.projectFolders, search, orderMap]);

  const sessionMenuRef = React.useRef<HTMLDivElement>(null);
  const projectsCreateAnchorRef = React.useRef<HTMLDivElement>(null);

  const avatarLetter = (props.userName?.trim()?.[0] || props.userEmail?.trim()?.[0] || "U").toUpperCase();

  const displayName = props.userName?.trim() || props.userEmail?.split("@")[0] || "Guest";

  const subText = props.isLoggedIn ? labels.yourAccount : labels.signInHint;

  const showWorkspaceSwitcher = !collapsed;
  const showProjects = props.isLoggedIn;
  const showAgents = props.isLoggedIn;
  const showMembers = props.isLoggedIn && environment === "workspace";

  const currentSessions = React.useMemo(() => {
    const projectSessionIds = new Set(
      projectsWithLists.flatMap((project) => (project.chats ?? []).map((s) => s.id))
    );

    return orderedRootSessions.filter((session) => !projectSessionIds.has(session.id));
  }, [orderedRootSessions, projectsWithLists]);

  return (
    <SidebarProvider
      L={labels}
      styles={styles}
      darkMode={props.darkMode}
      environment={environment}
      activeSessionId={props.activeSessionId ?? null}
    >
      <aside
        className={[
          "fixed md:static left-0 top-0 z-40",
          "h-screen shrink-0",
          "flex flex-col",
          "overflow-hidden",
          "border-r border-white/[0.06]",
          "backdrop-blur-2xl",
          "transition-all duration-300 ease-out",
          props.open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-[78px]" : "w-[240px]",
          styles.containerBg,
          styles.sideShadow,
        ].join(" ")}
      >
        <SidebarHeader
  open={props.open}
  onCloseAction={props.onCloseAction}

  collapsed={collapsed}
  darkMode={props.darkMode}

  onToggleCollapse={() =>
    setCollapsed((p) => !p)
  }

  searchOpen={searchOpen}
  searchValue={search}

  onOpenSearch={() => {
    setSearchOpen(true);
    setMenu(null);
  }}

  onCloseSearch={() => {
    setSearchOpen(false);
    setSearch("");
  }}

  onSearchChange={setSearch}
/>

        {showWorkspaceSwitcher ? (
          <WorkspaceSwitcherSection
            darkMode={props.darkMode}
            currentEnvironment={environment}
            onEnvironmentChangeAction={handleEnvironmentChange}
            onOpenBusinessSettingsAction={() => setShowUpgradeModal(true)}
          />
        ) : null}

        <div
          className={[
            "flex-1 overflow-y-auto",
            "qxt-scroll",
            styles.textMain,
            collapsed ? "px-2 py-2" : "px-3 pb-3 pt-2",
            "space-y-2",
            "min-w-0",
          ].join(" ")}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleGeneralNewChat}
                className={[styles.iconBtn, styles.iconTheme, "w-11 h-11 rounded-2xl", "bg-white/[0.04]", "hover:scale-[1.03]"].join(
                  " "
                )}
                aria-label="New chat"
              >
                +
              </button>

              <div className="w-8 h-px bg-white/[0.08]" />

              {orderedRootSessions.slice(0, 6).map((session) => (
                <button
                  key={session.id}
                  onClick={() => props.onOpenSessionAction?.(session.id)}
                  className={[
                    "w-11 h-11 rounded-2xl flex items-center justify-center",
                    "text-[11px] font-semibold transition-all duration-200",
                    session.id === props.activeSessionId ? collapsedActiveClass : "bg-white/[0.04] hover:bg-white/[0.08]",
                  ].join(" ")}
                  aria-label={session.title || "Open chat"}
                  title={session.title || "Open chat"}
                >
                  {(session.title || "C").charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <>
              <ScopeButton
                icon={<MessageSquarePlus className="w-4 h-4" />}
                title={labels.newChat}
                active={activeSection === "chats" && !runtimeAgentId}
                darkMode={props.darkMode}
                tone="chat"
                onClick={handleGeneralNewChat}
              />

              {showProjects ? (
                <div className="space-y-1">
                  <div
                    ref={projectsCreateAnchorRef}
                    className={cn(
                      "group flex h-9 items-center gap-2 rounded-lg px-2.5 transition-colors duration-200",
                      projectsPanelOpen ? "bg-amber-300/[0.09] text-amber-100" : "text-amber-100/85 hover:bg-amber-300/[0.06]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("projects");
                        setProjectsPanelOpen((p) => !p);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 bg-amber-300/[0.14] text-amber-200">
                        {projectsPanelOpen ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1 text-[13px] font-medium leading-5 truncate">{labels.projects}</div>

                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-200 ${
                          projectsPanelOpen ? "rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateProject();
                      }}
                      className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-amber-100/70 hover:text-amber-50 hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Create project"
                      title="Create project"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {projectsPanelOpen ? (
                    <div
                      className={cn(
                        "ml-4 border-l pl-3 space-y-2 py-1",
                        props.darkMode ? "border-white/[0.06]" : "border-black/[0.06]"
                      )}
                    >
                      <ProjectsSection
                        isLoggedIn={props.isLoggedIn}
                        L={labels}
                        projectsWithLists={projectsWithLists}
                        projectOpen={projectOpen}
                        creatingProject={creatingProject}
                        projectDraft={projectDraft}
                        setProjectDraft={setProjectDraft}
                        submitCreateProject={submitCreateProject}
                        closeCreateProject={closeCreateProject}
                        rowHover={styles.rowHover}
                        darkMode={props.darkMode}
                        miniIconBtn={styles.miniIconBtn}
                        miniIconTheme={styles.miniIconTheme}
                        iconBtn={styles.iconBtn}
                        iconTheme={styles.iconTheme}
                        menuItem={styles.menuItem}
                        rowActive={styles.rowActive}
                        q={search}
                        textMuted={styles.textMuted}
                        rootList={currentSessions}
                        onAccountClick={props.onAccountClickAction}
                        openCreateProject={openCreateProject}
                        activeSessionId={props.activeSessionId ?? null}
                        createChatInFolder={(folderId) => {
                          if (!props.onNewChatInFolderAction) {
                            console.warn("onNewChatInFolderAction is missing");
                            return;
                          }

                          props.onNewChatInFolderAction(folderId);
                        }}
                        createAnchorRef={projectsCreateAnchorRef}
                        setProjectOpen={setProjectOpen}
                        setDropProjectOver={dnd.setDropProjectOver}
                        setDraggingId={dnd.setDraggingId}
                        setDropOverId={dnd.setDropOverId}
                        setDropSectionOver={dnd.setDropSectionOver}
                        onMoveSessionToFolder={props.onMoveSessionToFolderAction}
                        draggingId={dnd.draggingId}
                        dropOverId={dnd.dropOverId}
                        dropProjectOver={dnd.dropProjectOver}
                        copiedSid={copiedSid}
                        menu={menu}
                        setMenu={setMenu}
                        sessionMenuRef={sessionMenuRef}
                        onOpenSession={(sid) => {
                          props.onOpenSessionAction?.(sid);
                        }}
                        onDeleteSession={props.onDeleteSessionAction}
                        onRenameSession={props.onRenameSessionAction}
                        onCopySessionLink={props.onCopySessionLinkAction}
                        onTogglePin={props.onTogglePinAction}
                        onToggleStar={props.onToggleStarAction}
                        onToggleUnread={props.onToggleUnreadAction}
                        orderMap={orderMap}
                        syncOrderKey={() => {}}
                        onReorderFolderSessions={props.onReorderFolderSessionsAction}
                        selectedProjectId={selectedProjectId}
                        onSelectProject={(projectId) => {
                          setSelectedProjectId(projectId);
                          setActiveSection("projects");
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showAgents ? (
                <AgentsSection
                  darkMode={props.darkMode}
                  open={agentsOpen}
                  setOpen={setAgentsOpen}
                  active={activeSection === "agents" && !!runtimeAgentId}
                  onActivate={(isActive) => {
                    setActiveSection(isActive ? "agents" : "chats");
                    setSelectedProjectId(null);
                    setMenu(null);
                  }}
                />
              ) : null}

              {showMembers ? (
                <div className="space-y-1">
                  <ScopeButton
                    icon={<Users className="w-4 h-4" />}
                    title="Members"
                    subtitle="Workspace members"
                    active={activeSection === "members"}
                    darkMode={props.darkMode}
                    tone="members"
                    onClick={() => {
                      if (runtimeAgentId) {
                        clearActiveAgent();
                      }

                      setActiveSection("members");
                      setMembersOpen((p) => !p);
                      setSelectedProjectId(null);
                    }}
                    trailing={
                      <ChevronRight
                        className={`w-4 h-4 opacity-70 transition-transform duration-200 ${
                          membersOpen ? "rotate-90" : "rotate-0"
                        }`}
                      />
                    }
                  />

                  {membersOpen ? <MembersSection darkMode={props.darkMode} /> : null}
                </div>
              ) : null}

              <div className={cn("mx-1 mt-2 mb-1 h-px", props.darkMode ? "bg-white/[0.06]" : "bg-black/[0.06]")} />

              <div className="mx-1 min-w-0">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2 pt-2 pb-2 transition-all duration-150",
                    // Highlight CHATS when a session is being dragged.
                    dnd.draggingId && !runtimeAgentId && activeSection !== "members"
                      ? props.darkMode
                        ? "bg-white/[0.035] ring-1 ring-white/[0.08]"
                        : "bg-black/[0.025] ring-1 ring-black/[0.08]"
                      : "",
                    props.darkMode ? "text-white/38" : "text-slate-500"
                  )}
                  onDragOver={(e) => {
                    // CHATS root only represents the current General scope.
                    // Agent chats must remain scoped to their agent.
                    if (!dnd.draggingId || runtimeAgentId || activeSection === "members") {
                      return;
                    }

                    e.preventDefault();
                    e.stopPropagation();

                    e.dataTransfer.dropEffect = "move";

                    dnd.setDropSectionOver("chats");
                    dnd.setDropProjectOver(null);
                    dnd.setDropOverId(null);
                  }}
                  onDragLeave={(e) => {
                    const nextTarget = e.relatedTarget as Node | null;

                    if (nextTarget && e.currentTarget.contains(nextTarget)) {
                      return;
                    }

                    dnd.setDropSectionOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (runtimeAgentId || activeSection === "members") {
                      return;
                    }

                    const sid =
                      dnd.draggingId ||
                      (() => {
                        try {
                          return (
                            e.dataTransfer.getData("application/x-qxt-session") ||
                            e.dataTransfer.getData("text/plain")
                          );
                        } catch {
                          return "";
                        }
                      })();

                    if (sid) {
                      // null = remove project/folder assignment
                      // and return the session to General Chats.
                      void props.onMoveSessionToFolderAction?.(sid, null);
                    }

                    dnd.setDraggingId(null);
                    dnd.setDropOverId(null);
                    dnd.setDropSectionOver(null);
                    dnd.setDropProjectOver(null);
                  }}
                >
                  <div className="min-w-0 truncate text-[11px] font-medium tracking-[0.08em] uppercase">
                    {runtimeAgentId
                      ? runtimeAgentName
                        ? `${runtimeAgentName} chats`
                        : "Agent chats"
                      : activeSection === "members"
                        ? "Workspace members"
                        : environment === "workspace"
                          ? "Workspace chats"
                          : "Chats"}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection(runtimeAgentId ? "agents" : "chats");
                      props.onNewChatAction();
                    }}
                    className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                      props.darkMode
                        ? "text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
                        : "text-slate-500 hover:text-slate-800 hover:bg-black/[0.05]"
                    )}
                    aria-label="New chat"
                    title="New chat"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {activeSection !== "members" ? (
                  <div className={cn("rounded-xl px-1 py-1", props.darkMode ? "bg-white/[0.02]" : "bg-black/[0.02]")}>
                    <ChatsSection
                      isLoggedIn={props.isLoggedIn}
                      L={labels}
                      rootList={currentSessions}
                      projectsWithLists={projectsWithLists}
                      activeSessionId={props.activeSessionId ?? null}
                      onOpenSession={props.onOpenSessionAction}
                      onDeleteSession={props.onDeleteSessionAction}
                      onRenameSession={props.onRenameSessionAction}
                      onCopySessionLink={props.onCopySessionLinkAction}
                      copiedSid={copiedSid}
                      menu={menu}
                      setMenu={setMenu}
                      sessionMenuRef={sessionMenuRef}
                      q={search}
                      rowActive={cn(
                        "bg-white/[0.06]",
                        props.darkMode ? "text-white/88" : "bg-black/[0.06] text-slate-900"
                      )}
                      onMoveSessionToFolder={props.onMoveSessionToFolderAction}
                      rowHover={cn(
                        "hover:bg-white/[0.04]",
                        props.darkMode ? "text-white/88" : "text-slate-900 hover:bg-black/[0.04]"
                      )}
                      darkMode={props.darkMode}
                      iconBtn="h-7 w-7 rounded-md flex items-center justify-center transition-colors"
                      iconTheme={
                        props.darkMode
                          ? "text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
                          : "text-slate-500 hover:text-slate-800 hover:bg-black/[0.05]"
                      }
                      menuItem={cn(
                        "rounded-md px-2 py-1.5 text-[12px] transition-colors",
                        props.darkMode ? "text-white/85 hover:bg-white/[0.06]" : "text-slate-700 hover:bg-black/[0.05]"
                      )}
                      draggingId={dnd.draggingId}
                      dropOverId={dnd.dropOverId}
                      setDraggingId={dnd.setDraggingId}
                      setDropOverId={dnd.setDropOverId}
                      setDropSectionOver={dnd.setDropSectionOver}
                      setDropProjectOver={dnd.setDropProjectOver}
                      orderMap={orderMap}
                      syncOrderKey={() => {}}
                      onReorderFolderSessions={props.onReorderFolderSessionsAction}
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <SidebarFooter
          collapsed={collapsed}
          avatarLetter={avatarLetter}
          displayName={displayName}
          subText={subText}
          isLoggedIn={props.isLoggedIn}
          onAccountClickAction={props.onAccountClickAction}
          onLogoutAction={props.onLogoutAction}
        />
      </aside>

      {props.businessState?.memberships?.length ? (
        <WorkspaceUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          workspaces={workspaces.map((ws) => ({
            id: ws.id,
            name: ws.name,
            plan: ws.plan,
          }))}
          currentPlanId={
            billing.plan === "starter" ? 2 : billing.plan === "pro" ? 3 : billing.plan === "elite" ? 4 : 1
          }
          onUpgrade={async (planId) => {
            console.log("upgrade", planId);
          }}
        />
      ) : (
        <PersonalUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlanId={
            billing.plan === "starter" ? 2 : billing.plan === "pro" ? 3 : billing.plan === "elite" ? 4 : 1
          }
          onUpgrade={async (planId) => {
            console.log("upgrade", planId);
          }}
        />
      )}
    </SidebarProvider>
  );
}