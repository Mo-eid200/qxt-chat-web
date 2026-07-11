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
  listSessions,
} from "@/app/lib/api/chat/sessions";

import {
  getStoredToken,
  getStoredContext,
  setStoredLastSession,
} from "@/app/lib/api/core/qxtClient";

import {
  createProjectFolder,
  fetchWorkspaceTree,
  moveSessionToFolder,
  normalizeWorkspaceTree,
  renameSession,
  reorderFolderSessions,
} from "@/app/lib/api/chat/sessionWorkspace";

import { getChatRoute } from "@/app/lib/runtime/getChatRoute";

import type { SessionItem }  from "@/app/qxt-chat/components/sidebar/types";
import type { ChatMessage }  from "@/app/types/chat";
import type { WorkspaceTree } from "@/app/types/workspace";

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
  const [sessions, setSessions]         = useState<SessionItem[]>([]);
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceTree>({
    folders: [],
    unfiled: [],
  });
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [renameOpen, setRenameOpen]       = useState(false);
  const [renameSid, setRenameSid]         = useState<string | null>(null);
  const [renameDraft, setRenameDraft]     = useState("");

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
      const res = await getSessionMessages(sid);

      const ui: ChatMessage[] = res
        .filter((m: any) => m.role === "user" || m.role === "assistant")
        .map((m: any) => {
          const images    = m.payload?.images    || m.images    || [];
          const videos    = m.payload?.videos    || m.videos    || [];
          const audioUrl  = m.payload?.audio_url || m.payload?.audioUrl || m.audio_url || m.audioUrl || null;

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

  const refreshSessions = useCallback(async (): Promise<SessionItem[]> => {
    if (!getStoredToken() || !isMountedRef.current) return [];

    try {
      const items = await listSessions();
      if (isMountedRef.current) setSessions(items as SessionItem[]);
      return items as SessionItem[];
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[refreshSessions]", error);
      }
      if (isMountedRef.current) setSessions([]);
      return [];
    }
  }, [isMountedRef]);

  // ─── refreshWorkspace ────────────────────────────────────────────────────────
  //
  // 🔥 FIX: this used to read runtimeRef.current.activeAgentId, a ref
  // captured ONCE at mount time and never updated — so switching
  // agents had zero effect on this function; it kept fetching the
  // workspace tree scoped to whatever agent (usually none) was active
  // when the component first mounted. That meant workspaceTree.unfiled
  // (passed to the sidebar as `unfiledSessions`, which the sidebar
  // prioritizes over the properly agent-scoped `sessions` list) never
  // reflected the actual active agent, making it look like switching
  // agents "did nothing" and leaking the general chat list into what
  // should have been an agent-only view.
  //
  // Fix: use the live `activeAgentId` parameter (passed into this hook
  // fresh on every render from AgentRuntimeContext) instead of the
  // stale ref.

  const refreshWorkspace = useCallback(async () => {
    if (!getStoredToken() || !isMountedRef.current) return;

    try {
      setWorkspaceBusy(true);

      const tree = await fetchWorkspaceTree({
        agentId: activeAgentId,
      });

      if (isMountedRef.current) {
        setWorkspaceTree(normalizeWorkspaceTree(tree));
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[refreshWorkspace]", error);
      }
      if (isMountedRef.current) {
        setWorkspaceTree({ folders: [], unfiled: [] });
      }
    } finally {
      if (isMountedRef.current) setWorkspaceBusy(false);
    }
  }, [isMountedRef, activeAgentId]);

  // ─── openSession ─────────────────────────────────────────────────────────────

  const openSession = useCallback(async (sid: string) => {
    stopRequest();
    hydratedRef.current = false;

    if (isMountedRef.current) {
      setSessionId(String(sid));
      router.replace(getChatRoute({ sessionId: sid, agentId: activeAgentId }));
    }
  }, [activeAgentId, hydratedRef, isMountedRef, router, stopRequest, setSessionId]);

  // ─── handleDeleteSession ──────────────────────────────────────────────────────

  const handleDeleteSession = useCallback(async (sid: string) => {
    try {
      await deleteSession(sid);

      const nextSessions = await refreshSessions();
      await refreshWorkspace();

      if (sessionId !== sid || !isMountedRef.current) return;

      setMessages([]);

      if (nextSessions.length > 0) {
        const firstId = String((nextSessions[0] as any).id);
        setSessionId(firstId);
        hydratedRef.current = false;
        router.replace(getChatRoute({ sessionId: firstId, agentId: activeAgentId }));
        await reloadSessionMessages(firstId);
        return;
      }

      setSessionId(null);
      hydratedRef.current = false;
      router.replace(getChatRoute({ sessionId: null, agentId: activeAgentId }));
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[handleDeleteSession]", error);
      }
    }
  }, [
    activeAgentId, hydratedRef, isMountedRef,
    refreshSessions, refreshWorkspace, reloadSessionMessages,
    router, sessionId, setMessages, setSessionId,
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

      await refreshSessions();
      await refreshWorkspace();
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

      await refreshSessions();
      await refreshWorkspace();
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
    if (!renameSid) return;
    const title = renameDraft.trim();
    if (!title) return;

    try {
      await renameSession(renameSid, title);
      await refreshSessions();
      await refreshWorkspace();
      closeRenameDialog();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[submitRenameDialog]", error);
      }
      alert("Could not rename.");
    }
  }, [closeRenameDialog, refreshSessions, refreshWorkspace, renameDraft, renameSid]);

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
      router.replace(getChatRoute({ sessionId: String(sid), agentId: activeAgentId }));
    }

    return String(sid);
  }, [activeAgentId, createChatSession, isMountedRef, router, sessionId, setSessionId]);

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
      await refreshWorkspace();
      await refreshSessions();
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

  // ─── Return ───────────────────────────────────────────────────────────────────

  return {
    sessionId,
    setSessionId,
    sessions,
    workspaceTree,
    workspaceBusy,
    renameOpen,
    renameSid,
    renameDraft,
    setRenameDraft,
    createChatSession,
    reloadSessionMessages,
    refreshSessions,
    refreshWorkspace,
    openSession,
    handleDeleteSession,
    handleNewChatInFolder,
    handleNewChat,
    openRenameDialog,
    closeRenameDialog,
    submitRenameDialog,
    ensureSession,
    handleCreateProjectFolder,
    handleMoveSessionToFolder,
    handleReorderFolderSessions,
    runtime: runtimeRef.current, // ✅ stable reference
  };
}