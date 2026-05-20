"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { SidebarProvider } from "../sidebar/constants/SidebarContext";
import { getSidebarLabels } from "../sidebar/constants/sidebarLabels";
import { getSidebarStyles } from "../sidebar/constants/sidebarStyles";
import WorkspaceSwitcherSection from "./sections/WorkspaceSwitcherSection";


import {
  LS_ORDER_MAP,
  LS_FOLDERS_OPEN,
  LS_PROJECT_FOLDERS_OPEN,
} from "../sidebar/constants/storageKeys";

import { useSidebarDnD } from "../sidebar/hooks/useSidebarDnD";
import { useSidebarStorage } from "../sidebar/hooks/useSidebarStorage";
import { useSidebarSearch } from "../sidebar/hooks/useSidebarSearch";

import { SidebarHeader } from "./layout/SidebarHeader";
import { SidebarFooter } from "./layout/SidebarFooter";

import { ChatsSection } from "./sections/ChatsSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { LibrarySection } from "./sections/LibrarySection";
import { CodeSection } from "./sections/CodeSection";
import { VisionSection } from "./sections/VisionSection";
import { UpgradeModal } from "../UpgradeModal";

import type {
  SessionItem,
  ProjectFolder,
  VisionKey,
} from "../sidebar/types";

import type {
  BusinessMeResponse,
} from "../../../types/business";
import { useBilling } from "../../../hooks/useBilling";



/* ======================================================
   TYPES
====================================================== */

export type ChatSidebarProps = {
  darkMode: boolean;
  open: boolean;

  businessState?:
  | BusinessMeResponse
  | null;

  businessLoading?: boolean;

  onToggleThemeAction: () => void;
  onNewChatAction: () => void;

  onNewChatInFolderAction?: (
    folderId: string | null
  ) => void;

  onCloseAction?: () => void;

  isLoggedIn: boolean;

  userName?: string | null;
  userEmail?: string | null;

  onAccountClickAction?: () => void;

  sessions?: SessionItem[];
  unfiledSessions?: SessionItem[];

  activeSessionId?: string | null;

  onOpenSessionAction?: (
    sid: string
  ) => void;

  onDeleteSessionAction?: (
    sid: string
  ) => void;

  onRenameSessionAction?: (
    sid: string
  ) => void;

  onCopySessionLinkAction?: (
    sid: string
  ) => void;

  onOpenVisionAction?: (
    key: VisionKey
  ) => void;

  projectFolders?: ProjectFolder[];

  onCreateProjectFolderAction?: (
    title: string
  ) => void;

  onMoveSessionToFolderAction?: (
    sid: string,
    folderId: string | null
  ) => void;

  onReorderFolderSessionsAction?: (
    folderId: string | null,
    orderedIds: string[]
  ) => void;

  workspaceBusy?: boolean;

  onRenameProjectFolderAction?: (
    folderId: string,
    currentTitle: string
  ) => void;

  onDeleteProjectFolderAction?: (
    folderId: string
  ) => void;
};

/* ======================================================
   COMPONENT
====================================================== */

export default function ChatSidebar(
  props: ChatSidebarProps
) {
  const router = useRouter();
  const billing = useBilling();

  /* ======================================================
     STATES
  ====================================================== */

  const [collapsed, setCollapsed] =
    React.useState(false);

  const [environment, setEnvironment] =
    React.useState<
      "personal" | "workspace"
    >("personal");

  React.useEffect(() => {
    if (
      localStorage.getItem(
        "qxt_workspace_id"
      )
    ) {
      setEnvironment("workspace");
    }
  }, []);

  const [search, setSearch] =
    React.useState("");

  const [menu, setMenu] =
    React.useState<
      | null
      | {
        type: "session";
        sid: string;
      }
      | {
        type: "search";
      }
    >(null);

  const [copiedSid, setCopiedSid] =
    React.useState<string | null>(null);

  const [creatingProject, setCreatingProject] =
    React.useState(false);

  const [projectDraft, setProjectDraft] =
    React.useState("");

  const [
    showUpgradeModal,
    setShowUpgradeModal,
  ] = React.useState(false);

  /* ======================================================
   ENVIRONMENT REFRESH
====================================================== */

  const handleEnvironmentChange =
    React.useCallback(
      (
        env: "personal" | "workspace"
      ) => {
        setEnvironment(env);

        // مهم جدًا
        setMenu(null);

        // reset ui states
        setCopiedSid(null);

        // optional
        router.refresh();
      },
      [router]
    );


  /* ======================================================
     LABELS / STYLES
  ====================================================== */

  const labels =
    getSidebarLabels(environment);

  const styles =
    getSidebarStyles(
      props.darkMode,
      props.open,
      environment
    );

  /* ======================================================
     DND
  ====================================================== */

  const dnd = useSidebarDnD();

  /* ======================================================
     STORAGE
  ====================================================== */

  const [sectionsOpen, setSectionsOpen] =
    useSidebarStorage<Record<string, boolean>>(
      LS_FOLDERS_OPEN,
      {
        root: true,
        projects: true,
        library: true,
        code: true,
      }
    );

  const [projectOpen, setProjectOpen] =
    useSidebarStorage<Record<string, boolean>>(
      LS_PROJECT_FOLDERS_OPEN,
      {}
    );

  const [orderMap] =
    useSidebarStorage<Record<string, string[]>>(
      LS_ORDER_MAP,
      {}
    );

  /* ======================================================
     CREATE PROJECT
  ====================================================== */

  const openCreateProject =
    React.useCallback(() => {
      setCreatingProject(true);
    }, []);

  const closeCreateProject =
    React.useCallback(() => {
      setCreatingProject(false);
      setProjectDraft("");
    }, []);

  const submitCreateProject =
    React.useCallback(() => {
      const title = projectDraft.trim();

      if (!title) return;

      props.onCreateProjectFolderAction?.(
        title
      );

      setCreatingProject(false);
      setProjectDraft("");
    }, [
      projectDraft,
      props.onCreateProjectFolderAction,
    ]);

  /* ======================================================
     ROOT SESSIONS
  ====================================================== */

  const rootSessions =
    Array.isArray(props.unfiledSessions) &&
      props.unfiledSessions.length > 0
      ? props.unfiledSessions
      : props.sessions ?? [];

  const filteredRootSessions =
    useSidebarSearch(
      rootSessions,
      search
    );

  const orderedRootSessions =
    React.useMemo(() => {
      const ids =
        orderMap["__root__"] || [];

      const map = new Map(
        filteredRootSessions.map((s) => [
          s.id,
          s,
        ])
      );

      const ordered = ids
        .map((id) => map.get(id))
        .filter(Boolean) as SessionItem[];

      const rest =
        filteredRootSessions.filter(
          (s) => !ids.includes(s.id)
        );

      return [...ordered, ...rest];
    }, [
      filteredRootSessions,
      orderMap,
    ]);

  /* ======================================================
     PROJECTS
  ====================================================== */

  const projectsWithLists =
    React.useMemo(() => {
      return (
        props.projectFolders ?? []
      ).map((folder) => {
        const chats = useSidebarSearch(
          Array.isArray(folder.chats)
            ? folder.chats
            : [],
          search
        );

        const ids =
          orderMap[folder.id] || [];

        const map = new Map(
          chats.map((s) => [s.id, s])
        );

        const ordered = ids
          .map((id) => map.get(id))
          .filter(Boolean) as SessionItem[];

        const rest = chats.filter(
          (s) => !ids.includes(s.id)
        );

        return {
          ...folder,
          chats: [...ordered, ...rest],
        };
      });
    }, [
      props.projectFolders,
      search,
      orderMap,
    ]);

  /* ======================================================
     REFS
  ====================================================== */

  const sessionMenuRef =
    React.useRef<HTMLDivElement>(null);

  /* ======================================================
     SHARED PROPS
  ====================================================== */

  const sharedSectionProps = {
    sectionsOpen,
    setSectionsOpen,

    L: labels,

    darkMode: props.darkMode,

    workspaceBusy:
      props.workspaceBusy ?? false,

    setDropSectionOver:
      dnd.setDropSectionOver,

    setDraggingId:
      dnd.setDraggingId,

    setDropOverId:
      dnd.setDropOverId,

    setDropProjectOver:
      dnd.setDropProjectOver,

    rowBase: styles.rowBase,
    rowHover: styles.rowHover,

    sectionAccent:
      styles.sectionAccent,

    miniIconBtn:
      styles.miniIconBtn,

    miniIconTheme:
      styles.miniIconTheme,

    iconBtn: styles.iconBtn,
    iconTheme: styles.iconTheme,
  };

  /* ======================================================
     USER
  ====================================================== */

  const avatarLetter =
    (
      props.userName?.trim()?.[0] ||
      props.userEmail?.trim()?.[0] ||
      "U"
    ).toUpperCase();

  const displayName =
    props.userName?.trim() ||
    props.userEmail?.split("@")[0] ||
    "Guest";

  const subText =
    props.isLoggedIn
      ? labels.yourAccount
      : labels.signInHint;

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <SidebarProvider
      L={labels}
      styles={styles}
      darkMode={props.darkMode}
      environment={environment}
      activeSessionId={
        props.activeSessionId ?? null
      }
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

          props.open
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",

          collapsed
            ? "w-[78px]"
            : "w-[248px]",

          styles.containerBg,
          styles.sideShadow,
        ].join(" ")}
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <SidebarHeader

          open={props.open}
          onCloseAction={props.onCloseAction}
          onAccountClickAction={
            props.onAccountClickAction
          }
          collapsed={collapsed}
          darkMode={props.darkMode}
          avatarLetter={
            (
              props.userName?.trim()?.[0] ||
              props.userEmail?.trim()?.[0] ||
              "U"
            ).toUpperCase()
          }
          displayName={
            props.userName?.trim() ||
            props.userEmail?.split("@")[0] ||
            "Guest"
          }
          subText={
            props.isLoggedIn
              ? labels.yourAccount
              : labels.signInHint
          }
        />

        {/* ======================================================
    WORKSPACE SWITCHER
====================================================== */}

        {!collapsed && (
          <WorkspaceSwitcherSection
            darkMode={props.darkMode}
            businessState={
              props.businessState ?? null
            }
            currentEnvironment={environment}
            onEnvironmentChangeAction={
              handleEnvironmentChange
            }
            onOpenBusinessSettingsAction={() =>
              setShowUpgradeModal(true)
            }
          />
        )}

        {/* ======================================================
            BODY
        ====================================================== */}

        <div
          className={[
            "flex-1 overflow-y-auto",
            "qxt-scroll",
            styles.textMain,

            collapsed
              ? "px-2 py-2"
              : "px-2 pb-2 pt-1.5",

            "space-y-1.5",
            "min-w-0",
          ].join(" ")}
        >
          {/* =========================================
              COLLAPSED MODE
          ========================================= */}

          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={
                  props.onNewChatAction
                }
                className={[
                  styles.iconBtn,
                  styles.iconTheme,
                  "w-11 h-11 rounded-2xl",
                  "bg-white/[0.04]",
                  "hover:scale-[1.03]",
                ].join(" ")}
              >
                +
              </button>

              <div className="w-8 h-px bg-white/[0.08]" />

              {orderedRootSessions
                .slice(0, 6)
                .map((session) => (
                  <button
                    key={session.id}
                    onClick={() =>
                      props.onOpenSessionAction?.(
                        session.id
                      )
                    }
                    className={[
                      "w-11 h-11",
                      "rounded-2xl",
                      "flex items-center justify-center",
                      "text-[11px] font-semibold",
                      "transition-all duration-200",
                      session.id ===
                        props.activeSessionId
                        ? "bg-cyan-500 text-white"
                        : "bg-white/[0.04] hover:bg-white/[0.08]",
                    ].join(" ")}
                  >
                    {(
                      session.title ||
                      "C"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </button>
                ))}
            </div>
          ) : (
            <>
              {/* =========================================
                  FULL MODE
              ========================================= */}

              <div
                className={[
                  styles.sectionLabel,
                  "px-1",
                ].join(" ")}
              >
                {labels.workspace}
              </div>

              <ChatsSection
                isLoggedIn={
                  props.isLoggedIn
                }
                L={labels}
                rootList={
                  orderedRootSessions
                }
                activeSessionId={
                  props.activeSessionId ??
                  null
                }
                onOpenSession={
                  props.onOpenSessionAction
                }
                onDeleteSession={
                  props.onDeleteSessionAction
                }
                onRenameSession={
                  props.onRenameSessionAction
                }
                onCopySessionLink={
                  props.onCopySessionLinkAction
                }
                copiedSid={copiedSid}
                menu={menu}
                setMenu={setMenu}
                sessionMenuRef={
                  sessionMenuRef
                }
                q={search}
                rowActive={
                  styles.rowActive
                }
                rowHover={
                  styles.rowHover
                }
                darkMode={
                  props.darkMode
                }
                iconBtn={styles.iconBtn}
                iconTheme={
                  styles.iconTheme
                }
                menuItem={
                  styles.menuItem
                }
              />

              <ProjectsSection
                isLoggedIn={
                  props.isLoggedIn
                }

                L={labels}
                projectsWithLists={
                  projectsWithLists
                }
                projectOpen={
                  projectOpen
                }
                openCreateProject={
                  openCreateProject
                }
                creatingProject={
                  creatingProject
                }
                projectDraft={
                  projectDraft
                }
                setProjectDraft={
                  setProjectDraft
                }
                submitCreateProject={
                  submitCreateProject
                }
                closeCreateProject={
                  closeCreateProject
                }
                rowHover={
                  styles.rowHover
                }
                darkMode={
                  props.darkMode
                }
                miniIconBtn={
                  styles.miniIconBtn
                }
                miniIconTheme={
                  styles.miniIconTheme
                }
                q={search}
                textMuted={
                  styles.textMuted
                }
                sectionProps={{
                  ...sharedSectionProps,
                  isOpen: false,
                  dropOn: false,
                }}
                rootList={
                  orderedRootSessions
                }
                onAccountClick={
                  props.onAccountClickAction
                }
                createChatInFolder={
                  props
                    .onNewChatInFolderAction ??
                  (() => { })
                }
                setProjectOpen={
                  setProjectOpen
                }
                setDropProjectOver={
                  dnd.setDropProjectOver
                }
                setDraggingId={
                  dnd.setDraggingId
                }
                setDropOverId={
                  dnd.setDropOverId
                }
                setDropSectionOver={
                  dnd.setDropSectionOver
                }
                onMoveSessionToFolder={
                  props.onMoveSessionToFolderAction
                }
                draggingId={
                  dnd.draggingId
                }
                dropProjectOver={
                  dnd.dropProjectOver
                }
                createChatInProject={
                  props
                    .onNewChatInFolderAction ??
                  (() => { })
                }
              />

              <LibrarySection
                L={labels}
                router={router}
                sectionProps={{
                  ...sharedSectionProps,
                  isOpen: false,
                  dropOn: false,
                }}
              />

              <CodeSection
                L={labels}
                router={router}
                sectionProps={{
                  ...sharedSectionProps,
                  isOpen: false,
                  dropOn: false,
                }}
              />

              <VisionSection
                L={labels}
                rowBase={styles.rowBase}
                rowHover={
                  styles.rowHover
                }
                onOpenVision={
                  props.onOpenVisionAction
                }
              />
            </>
          )}
        </div>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <SidebarFooter
          collapsed={collapsed}
          darkMode={props.darkMode}
          onToggleCollapse={() =>
            setCollapsed((p) => !p)
          }
        />
      </aside>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() =>
          setShowUpgradeModal(false)
        }
        currentPlanId={
          billing.plan === "starter"
            ? 2
            : billing.plan === "pro"
              ? 3
              : billing.plan === "elite"
                ? 4
                : 1
        }

        isCompanyAccount={
          !!props.businessState
            ?.memberships?.length
        }
        onUpgrade={async (
          planId,
          billing
        ) => {
          console.log(
            "upgrade",
            planId,
            billing
          );
        }}
      />
    </SidebarProvider>
  );
}