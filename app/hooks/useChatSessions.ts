"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  createSession,
  deleteSession,
  getSessionMessages,
  updateSession,
} from "@/app/lib/api/chat/sessions";

import {
  getStoredToken,
  getStoredContext,
  setStoredLastSession,
} from "@/app/lib/api/core/qxtClient";

import {
  createProjectFolder,
  moveSessionToFolder,
  renameSession,
  reorderFolderSessions,
} from "@/app/lib/api/chat/sessionWorkspace";

import { getChatRoute } from "@/app/lib/runtime/getChatRoute";

import {
  useSessionsQuery,
} from "@/app/hooks/useSessionsQuery";

import {
  useWorkspaceTreeQuery,
} from "@/app/hooks/useWorkspaceTreeQuery";

import type { SessionItem }  from "@/app/qxt-chat/components/sidebar/types";
import type { ChatMessage }  from "@/app/types/chat";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = {
  activeAgentId:  string | null;
  streaming:      boolean;
  loading:        boolean;
  sendingRef:     React.MutableRefObject<boolean>;
  hydratedRef:    React.MutableRefObject<boolean>;
  isMountedRef:   React.MutableRefObject<boolean>;
  stopRequest:    () => void;
  setMessages:    React.Dispatch<React.SetStateAction<ChatMessage[]>>;
};

// ─── Scoped last session helpers ──────────────────────────────────────────────
// كل scope (personal / workspace / agent) عنده key منفصل

function buildScopedLastSessionKey(): string {
  const runtime = getStoredContext();

  if (runtime.activeAgentId) {
    return `qxt_last_session_id:agent:${runtime.activeAgentId}`;
  }

  if (runtime.spaceType === "workspace" && runtime.workspaceId) {
    return `qxt_last_session_id:workspace:${runtime.workspaceId}`;
  }

  return "qxt_last_session_id:personal";
}

function getScopedLastSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(buildScopedLastSessionKey())?.trim() || null;
  } catch {
    return null;
  }
}

function setScopedLastSession(sessionId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = buildScopedLastSessionKey();
    if (sessionId?.trim()) {
      localStorage.setItem(key, sessionId);
    } else {
      localStorage.removeItem(key);
    }
  } catch { /* ignore */ }

  setStoredLastSession(sessionId);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatSessions({
  activeAgentId,
  streaming,
  loading,
  sendingRef,
  hydratedRef,
  isMountedRef,
  stopRequest,
  setMessages,
}: Params) {
  const router = useRouter();

  // ✅ runtime قرأه مرة واحدة عند mount - مش في كل render
  const runtimeRef = useRef(getStoredContext());

  const [sessionId, setSessionIdState] = useState<string | null>(null);

  // Close only the session currently displayed in React.
  // Do NOT touch the scoped last-session key in localStorage.
  // This is used when switching Personal / Workspace / Agent runtime.
  const clearActiveSession = useCallback(() => {
    setSessionIdState(null);
  }, []);

  // Sessions list backed by React Query — see useSessionsQuery.
// Sessions list backed by React Query
const { sessions, refetch: refetchSessions } =
  useSessionsQuery(activeAgentId);

// Workspace tree backed by React Query
const { workspaceTree, refetch: refetchWorkspaceTree } =
  useWorkspaceTreeQuery(activeAgentId);

const queryClient = useQueryClient();

const [workspaceBusy, setWorkspaceBusy] = useState(false);
const [renameOpen, setRenameOpen] = useState(false);
const [renameSid, setRenameSid] = useState<string | null>(null);
const [renameDraft, setRenameDraft] = useState("");
const [renameBusy, setRenameBusy] = useState(false);

const [deleteOpen, setDeleteOpen] = useState(false);
const [deleteSid, setDeleteSid] = useState<string | null>(null);
const [deleteTitle, setDeleteTitle] = useState("");
const [deleteBusy, setDeleteBusy] = useState(false);

  // ─── setSessionId ────────────────────────────────────────────────────────────

  const setSessionId = useCallback((sid: string | null) => {
    setSessionIdState(sid);
    setScopedLastSession(sid ? String(sid) : null);
  }, []);

  // ─── createChatSession ───────────────────────────────────────────────────────

  const createChatSession = useCallback(async (extra?: Record<string, any>) => {
    const created = await createSession(extra as any);
    if (created?.id) setScopedLastSession(String(created.id));
    return created;
  }, []);

  // ─── reloadSessionMessages ───────────────────────────────────────────────────

  const reloadSessionMessages = useCallback(async (sid: string) => {
  if (!isMountedRef.current) return;

  try {
    // 🔥 Perf: cache each session's raw message payload for 60s.
    // Reopening a session already viewed within that window returns
    // instantly from the React Query cache instead of re-hitting the
    // backend. sendMessage() streaming still updates local `messages`
    // state directly, unaffected by this cache.
    const res = await queryClient.fetchQuery({
      queryKey: ["messages", sid],
      queryFn: () => getSessionMessages(sid),
      staleTime: 60_000,
    });

      const ui: ChatMessage[] = res
        .filter((m: any) => m.role === "user" || m.role === "assistant")
        .map((m: any) => {
          const images    = m.payload?.images    || m.images    || [];
          const videos    = m.payload?.videos    || m.videos    || [];
          const audioUrl =
            m.payload?.audio_url ||
            m.payload?.audioUrl ||
            m.audio_url ||
            m.audioUrl ||
          (Array.isArray(m.payload?.audio) && m.payload.audio.length > 0 ? m.payload.audio[0] : null) ||
          null;

          const documents = Array.isArray(m.payload?.documents)
            ? m.payload.documents.map((d: any) => ({
                type:     "document" as const,
                url:      d.url  || d.file_url,
                name:     d.name || d.filename,
                size:     d.size,
                mimeType: d.mime_type,
              }))
            : [];

          let kind: ChatMessage["kind"] = "text";
          if (documents.length > 0)    kind = "document";
          else if (videos.length > 0)  kind = "video";
          else if (images.length > 0)  kind = "image";

          return {
            id:        String(m.id ?? m.request_id ?? crypto.randomUUID()),
            role:      m.role,
            content:   m.content,
            images:    images.length    > 0 ? images    : undefined,
            videos:    videos.length    > 0 ? videos    : undefined,
            documents: documents.length > 0 ? documents : undefined,
            ...(audioUrl ? { audioUrl: String(audioUrl) } : {}),
            kind: audioUrl ? "audio" : kind,
          };
        });

      if (isMountedRef.current) {
        setSessionId(String(sid));
        setMessages(ui);
      }
    } catch (error: any) {
      if (error?.response?.status === 404 && isMountedRef.current) {
        setSessionId(null);
        setMessages([]);
        router.replace(getChatRoute({ sessionId: null, agentId: activeAgentId }));
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.error("[reloadSessionMessages]", error);
      }
    }
  }, [activeAgentId, isMountedRef, router, setMessages, setSessionId]);

  // ─── refreshSessions ─────────────────────────────────────────────────────────
  //
  // Same external contract as before (returns Promise<SessionItem[]>).

  // ─── refreshSessions ─────────────────────────────────────────────────────────

const refreshSessions = useCallback(async (): Promise<SessionItem[]> => {
  if (!getStoredToken() || !isMountedRef.current) return [];

  try {
    // Refetch the current scoped sessions query exactly once.
    const result = await refetchSessions();

    return (result.data ?? []) as SessionItem[];
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[refreshSessions]", error);
    }

    return [];
  }
}, [refetchSessions, isMountedRef]);

// ─── refreshWorkspace ────────────────────────────────────────────────────────

const refreshWorkspace = useCallback(async () => {
  if (!getStoredToken() || !isMountedRef.current) return;

  try {
    setWorkspaceBusy(true);

    // Refetch the current scoped workspace tree exactly once.
    await refetchWorkspaceTree();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[refreshWorkspace]", error);
    }
  } finally {
    if (isMountedRef.current) {
      setWorkspaceBusy(false);
    }
  }
}, [refetchWorkspaceTree, isMountedRef]);

  // ─── openSession ─────────────────────────────────────────────────────────────

  const openSession = useCallback(async (sid: string) => {
    stopRequest();
    hydratedRef.current = false;

    if (isMountedRef.current) {
      setSessionId(String(sid));
      router.replace(getChatRoute({ sessionId: sid, agentId: activeAgentId }));
    }
  }, [activeAgentId, hydratedRef, isMountedRef, router, stopRequest, setSessionId]);

  // ─── Delete ─────────────────────────────────────────────────────────────────

const handleDeleteSession = useCallback(
  (sid: string) => {
    const current =
      sessions.find(
        (x) => String(x.id) === String(sid)
      )?.title ?? "Untitled chat";

    setDeleteSid(String(sid));
    setDeleteTitle(
      String(current || "Untitled chat")
    );
    setDeleteOpen(true);
  },
  [sessions]
);

const closeDeleteDialog = useCallback(() => {
  if (deleteBusy) return;

  setDeleteOpen(false);
  setDeleteSid(null);
  setDeleteTitle("");
}, [deleteBusy]);

const confirmDeleteSession = useCallback(async () => {
  if (!deleteSid || deleteBusy) return;

  const sid = deleteSid;

  try {
    setDeleteBusy(true);

    await deleteSession(sid);

    const [nextSessions] = await Promise.all([
      refreshSessions(),
      refreshWorkspace(),
    ]);

    setDeleteOpen(false);
    setDeleteSid(null);
    setDeleteTitle("");

    if (
      sessionId !== sid ||
      !isMountedRef.current
    ) {
      return;
    }

    setMessages([]);

    if (nextSessions.length > 0) {
      const firstId = String(
        (nextSessions[0] as any).id
      );

      setSessionId(firstId);
      hydratedRef.current = false;

      router.replace(
        getChatRoute({
          sessionId: firstId,
          agentId: activeAgentId,
        })
      );

      await reloadSessionMessages(firstId);
      return;
    }

    setSessionId(null);
    hydratedRef.current = false;

    router.replace(
      getChatRoute({
        sessionId: null,
        agentId: activeAgentId,
      })
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[confirmDeleteSession]",
        error
      );
    }
  } finally {
    if (isMountedRef.current) {
      setDeleteBusy(false);
    }
  }
}, [
  activeAgentId,
  deleteBusy,
  deleteSid,
  hydratedRef,
  isMountedRef,
  refreshSessions,
  refreshWorkspace,
  reloadSessionMessages,
  router,
  sessionId,
  setMessages,
  setSessionId,
]);

  // ─── handleNewChatInFolder ────────────────────────────────────────────────────

  const handleNewChatInFolder = useCallback(async (folderId: string | null) => {
    if (!getStoredToken()) return;

    stopRequest();
    setMessages([]);
    hydratedRef.current = false;

    try {
      const created = await createChatSession({ folder_id: folderId });

      if (isMountedRef.current) {
        setSessionId(String(created.id));
        router.replace(getChatRoute({ sessionId: String(created.id), agentId: activeAgentId }));
      }

      await Promise.all([refreshSessions(), refreshWorkspace()]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[handleNewChatInFolder]", error);
      }
    }
  }, [
    activeAgentId, createChatSession, hydratedRef, isMountedRef,
    refreshSessions, refreshWorkspace, router, setMessages, stopRequest, setSessionId,
  ]);

  // ─── handleNewChat ────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    if (!getStoredToken()) {
      setSessionId(null);
      hydratedRef.current = false;
      router.replace(getChatRoute({ sessionId: null, agentId: activeAgentId }));
      return;
    }

    stopRequest();
    setMessages([]);
    hydratedRef.current = false;

    try {
      const created = await createChatSession();

      if (isMountedRef.current) {
        setSessionId(String(created.id));
        router.replace(getChatRoute({ sessionId: String(created.id), agentId: activeAgentId }));
      }

      await Promise.all([refreshSessions(), refreshWorkspace()]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[handleNewChat]", error);
      }
      setSessionId(null);
      hydratedRef.current = false;
      router.replace(getChatRoute({ sessionId: null, agentId: activeAgentId }));
    }
  }, [
    activeAgentId, createChatSession, hydratedRef, isMountedRef,
    refreshSessions, refreshWorkspace, router, setMessages, stopRequest, setSessionId,
  ]);

  // ─── Rename ───────────────────────────────────────────────────────────────────

  const openRenameDialog = useCallback((sid: string) => {
    const current = sessions.find((x) => String(x.id) === String(sid))?.title ?? "Chat";
    setRenameSid(String(sid));
    setRenameDraft((current || "").toString());
    setRenameOpen(true);
  }, [sessions]);

  const closeRenameDialog = useCallback(() => {
    setRenameOpen(false);
    setRenameSid(null);
    setRenameDraft("");
  }, []);

const submitRenameDialog = useCallback(async () => {
  if (!renameSid || renameBusy) return;

  const title = renameDraft.trim();

  if (!title) return;

  try {
    setRenameBusy(true);

    await renameSession(renameSid, title);

    await Promise.all([
      refreshSessions(),
      refreshWorkspace(),
    ]);

    closeRenameDialog();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[submitRenameDialog]",
        error
      );
    }
  } finally {
    if (isMountedRef.current) {
      setRenameBusy(false);
    }
  }
}, [
  closeRenameDialog,
  isMountedRef,
  refreshSessions,
  refreshWorkspace,
  renameBusy,
  renameDraft,
  renameSid,
]);

  // ─── ensureSession ────────────────────────────────────────────────────────────

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;

    const remembered = getScopedLastSession();
    if (remembered) {
      setSessionId(String(remembered));
      return String(remembered);
    }

    const created = await createChatSession();
const sid = created?.id;
if (!sid) throw new Error("Session creation failed");

if (isMountedRef.current) {
  setSessionId(String(sid));

  router.replace(
    getChatRoute({
      sessionId: String(sid),
      agentId: activeAgentId,
    })
  );

  // Sync sidebar immediately after creating the first session.
  await Promise.all([
    refreshSessions(),
    refreshWorkspace(),
  ]);
}

return String(sid);
  }, [
  activeAgentId,
  createChatSession,
  isMountedRef,
  router,
  sessionId,
  setSessionId,
  refreshSessions,
  refreshWorkspace,
]);

  // ─── Workspace actions ────────────────────────────────────────────────────────

  const handleCreateProjectFolder = useCallback(async (title?: string) => {
    if (!getStoredToken()) return;
    const name = (title ?? "").trim();
    if (!name) return;

    try {
      setWorkspaceBusy(true);
      await createProjectFolder(name);
      await refreshWorkspace();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[handleCreateProjectFolder]", error);
      }
      alert("Could not create folder.");
    } finally {
      setWorkspaceBusy(false);
    }
  }, [refreshWorkspace]);

  const handleMoveSessionToFolder = useCallback(async (
    sid: string,
    folderId: string | null
  ) => {
    if (!getStoredToken()) return;

    try {
      setWorkspaceBusy(true);
      await moveSessionToFolder(String(sid), folderId);
      await Promise.all([refreshWorkspace(), refreshSessions()]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[handleMoveSessionToFolder]", error);
      }
    } finally {
      setWorkspaceBusy(false);
    }
  }, [refreshSessions, refreshWorkspace]);

  const handleReorderFolderSessions = useCallback(async (
    folderId: string | null,
    orderedIds: string[]
  ) => {
    if (!getStoredToken() || !folderId) return;

    try {
      await reorderFolderSessions(folderId, orderedIds);
      await refreshWorkspace();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[handleReorderFolderSessions]", error);
      }
    }
  }, [refreshWorkspace]);


  // ─── Pin / Unpin ──────────────────────────────────────────────────────────────

const handleTogglePin = useCallback(
  async (sid: string) => {
    const session = sessions.find(
      (item) => String(item.id) === String(sid)
    );

    if (!session) return;

    const nextPinned = !Boolean(session.pinned);

    try {
      await updateSession(String(sid), {
        pinned: nextPinned,
      });

      await Promise.all([
        refreshSessions(),
        refreshWorkspace(),
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[handleTogglePin]",
          error
        );
      }
    }
  },
  [
    sessions,
    refreshSessions,
    refreshWorkspace,
  ]
);

// ─── Star / Unstar ────────────────────────────────────────────────────────────

const handleToggleStar = useCallback(
  async (sid: string) => {
    const session = sessions.find(
      (item) => String(item.id) === String(sid)
    );

    if (!session) return;

    const nextStarred = !Boolean(session.starred);

    try {
      await updateSession(String(sid), {
        starred: nextStarred,
      });

      await Promise.all([
        refreshSessions(),
        refreshWorkspace(),
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[handleToggleStar]",
          error
        );
      }
    }
  },
  [
    sessions,
    refreshSessions,
    refreshWorkspace,
  ]
);


// ─── Mark unread / read ───────────────────────────────────────────────────────

const handleToggleUnread = useCallback(
  async (sid: string) => {
    const session = sessions.find(
      (item) => String(item.id) === String(sid)
    );

    if (!session) return;

    const nextMarkedUnread =
      !Boolean(session.marked_unread);

    try {
      await updateSession(String(sid), {
        marked_unread: nextMarkedUnread,
      });

      await Promise.all([
        refreshSessions(),
        refreshWorkspace(),
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[handleToggleUnread]",
          error
        );
      }
    }
  },
  [
    sessions,
    refreshSessions,
    refreshWorkspace,
  ]
);

  // ─── Return ───────────────────────────────────────────────────────────────────

 return {
  sessionId,
  setSessionId,
  clearActiveSession,

  sessions,
  workspaceTree,
  workspaceBusy,

  // Rename
  renameOpen,
  renameSid,
  renameDraft,
  renameBusy,
  setRenameDraft,
  openRenameDialog,
  closeRenameDialog,
  submitRenameDialog,

  // Delete
  deleteOpen,
  deleteSid,
  deleteTitle,
  deleteBusy,
  closeDeleteDialog,
  confirmDeleteSession,

  // Sessions
  createChatSession,
  reloadSessionMessages,
  refreshSessions,
  refreshWorkspace,
  openSession,
  handleDeleteSession,
  handleTogglePin,
  handleToggleStar,
  handleNewChatInFolder,
  handleNewChat,
  ensureSession,
  handleToggleUnread,

  // Workspace
  handleCreateProjectFolder,
  handleMoveSessionToFolder,
  handleReorderFolderSessions,

  runtime: runtimeRef.current,
};
}
