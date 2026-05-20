"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatHeader } from "./components/ChatHeader";
import ChatSidebar from "./components/sidebar/ChatSidebar";
import { ChatFooter } from "./components/ChatFooter";
import AuthModal from "./components/AuthModal";
import { UpgradeModal } from "./components/UpgradeModal";
import { API_BASE } from "../lib/config";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { qxtChatClient, getStoredToken, getStoredWorkspace, ensureWorkspaceLoaded, } from "../lib/api/core/qxtClient";
import { useAuth } from "../context/AuthContext";
import { useModels } from "../context/ModelsContext";
import { getBusinessMe } from "../lib/api/business/business";

import {
    createSession,
    getSessionMessages,
    listSessions,
    deleteSession,
} from "../lib/api/chat/sessions";
import type { SessionItem } from "./components/sidebar/types";
import type { ChatMessage, Reaction, PendingStage, AIStage } from "../types/chat";
import type { ProjectFolder, WorkspaceTree } from "../types/workspace";
import ChatMessages from "./components/ChatMessages";
import RenameDialog from "./components/RenameDialog";
import type { VoiceMessagePayload } from "../types/chat";
import type { BusinessMeResponse } from "../types/business";



export default function QXTChatPage() {
    return <QXTChatInner />;
}

function QXTChatInner() {
    const router = useRouter();
    const sp = useSearchParams();
    const { user, loadingUser } = useAuth();
    const isLoggedIn = !!user;
    const { selected, models, selectModel } = useModels();

    // ========== STATE ==========
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [streamText, setStreamText] = useState("");
    const [pendingStage, setPendingStage] = useState<PendingStage>(null);
    const [stageHistory, setStageHistory] = useState<AIStage[]>([]);

    const [darkMode, setDarkMode] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [lang, setLang] = useState<"en" | "ar">("en");
    const [shouldDockBottom, setShouldDockBottom] = useState(false);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [workspaceTree, setWorkspaceTree] = useState<WorkspaceTree>({
        folders: [],
        unfiled: [],
    });
    const [workspaceBusy, setWorkspaceBusy] = useState(false);

    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [reactions, setReactions] = useState<Record<number, Reaction>>({});
    const [expandedMsgs, setExpandedMsgs] = useState<Record<number, boolean>>({});
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingText, setEditingText] = useState("");

    const [pendingImages, setPendingImages] = useState<
        Array<{ url: string; preview: string; type: "image" | "video" }>
    >([]);
    const [pendingDocuments, setPendingDocuments] = useState<
        Array<{ url: string; name: string; size?: number; mimeType?: string }>
    >([]);

    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameSid, setRenameSid] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");

    // ========== REFS ==========
    const abortRef = useRef<AbortController | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const shouldAutoScrollRef = useRef(true);
    const sendingRef = useRef(false);
    const limitReachedRef = useRef(false);
    const pendingTimersRef = useRef<number[]>([]);
    const isMountedRef = useRef(true);
    const hydratedRef = useRef(false);

    // ========== COMPUTED ==========

    const createWorkspaceSession = useCallback(
        async (extra?: Record<string, any>) => {
            const workspaceId = getStoredWorkspace();
            if (!workspaceId) {
                throw new Error("Workspace not ready");
            }
            return await createSession({
                workspace_id: workspaceId,
                ...extra,
            } as any);
        },
        []
    );

    const conversationStarted = useMemo(
        () => messages.length > 0 || streaming || streamText.length > 0,
        [messages, streaming, streamText]
    );

    const busy = loading || streaming || !!pendingStage;
    const composerMode = shouldDockBottom ? "bottom" : "center";
    const isAr = lang === "ar";
    const assistantName = "Quarc";
    const messageDir = isAr ? "rtl" : "ltr";
    const messageTextAlign = isAr ? "text-right" : "text-left";

    const userName =
        (user as any)?.full_name ||
        (user?.email ? user.email.split("@")[0] : null) ||
        null;

    const rootBG = darkMode
        ? "bg-[#020712]"
        : "bg-gradient-to-b from-[#052536] via-[#063747] to-[#041c28]";

    const overlayGrid = darkMode
        ? "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.14),_transparent_55%)]"
        : "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(6,148,162,0.12),_transparent_55%)]";

    const baseText = darkMode ? "text-emerald-50" : "text-cyan-50";
    const scrollClasses = "qxt-scroll scroll-smooth";

    const welcomeTitle = "Welcome to Chat-QXT";
    const welcomeBody = "Start by typing any idea, question, or project you'd like us to work on together.";

    const rotatingHints = useMemo(
        () => [
            "Improve your CV or LinkedIn profile.",
            "Ask for an online business plan.",
            "Validate a startup idea step by step.",
            "Craft a powerful email or outreach message.",
            "Design a marketing plan for your project.",
        ],
        []
    );

    const placeholderPhrases = useRef([
        "Start your first conversation with Quarc...",
        ...rotatingHints,
        "Type any question or idea you have in mind...",
    ]).current;

    const activePlaceholder = "Type your message here, then press Enter to send...";
    const [typedPlaceholder, setTypedPlaceholder] = useState("");
    const phraseIndexRef = useRef(0);

    const activeSessionTitle = useMemo(() => {
        if (!sessionId) return null;
        const s = sessions.find((x) => String(x.id) === String(sessionId));
        return s?.title ?? null;
    }, [sessions, sessionId]);

    const [businessState, setBusinessState] =
        useState<BusinessMeResponse | null>(null);

    const [businessLoading, setBusinessLoading] =
        useState(true);

    const loadBusinessState = useCallback(async () => {
        const token = getStoredToken();

        if (!token) {
            setBusinessState(null);
            setBusinessLoading(false);
            return;
        }

        try {
            setBusinessLoading(true);

            const data = await getBusinessMe();

            setBusinessState(data);
        } catch (e) {
            setBusinessState(null);
        } finally {
            setBusinessLoading(false);
        }
    }, []);

    // ========== CLEANUP ==========
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            pendingTimersRef.current.forEach((t) => window.clearTimeout(t));
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, []);

    // ========== PLACEHOLDER ANIMATION ==========
    useEffect(() => {
        if (conversationStarted) {
            setTypedPlaceholder(activePlaceholder);
            return;
        }

        const phrase = placeholderPhrases[phraseIndexRef.current];
        let charIndex = 0;
        setTypedPlaceholder("");

        const typing = setInterval(() => {
            setTypedPlaceholder(phrase.slice(0, charIndex + 1));
            charIndex++;

            if (charIndex >= phrase.length) {
                clearInterval(typing);
                setTimeout(() => {
                    phraseIndexRef.current = (phraseIndexRef.current + 1) % placeholderPhrases.length;
                    setTypedPlaceholder("");
                }, 2200);
            }
        }, 32);

        return () => clearInterval(typing);
    }, [conversationStarted, activePlaceholder, placeholderPhrases]);

    // ========== SCROLL DETECTION ==========
    useEffect(() => {
        const el = bottomRef.current?.closest("main");
        if (!el) return;

        const onScroll = () => {
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            shouldAutoScrollRef.current = nearBottom;
        };

        el.addEventListener("scroll", onScroll);
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    // ========== AUTO SCROLL ==========
    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;
        bottomRef.current?.scrollIntoView({
            behavior: streaming ? "auto" : "smooth",
            block: "end",
        });
    }, [messages, streaming]);

    // ========== DOCK DETECTION ==========
    useEffect(() => {
        const el = bottomRef.current?.closest("main");
        if (!el) return;
        setShouldDockBottom(el.scrollHeight > el.clientHeight);
    }, [messages]);

    // ========== SYNC MESSAGES REF ==========
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // ========== LOGOUT RESET ==========
    useEffect(() => {
        if (isLoggedIn) return;

        setWorkspaceTree({ folders: [], unfiled: [] });
        setSessionId(null);
        setSessions([]);
        setMessages([]);
        setStreaming(false);
        setStreamText("");
        setReactions({});
        setCopiedIndex(null);
        setExpandedMsgs({});
        setEditingIndex(null);
        setEditingText("");
        setInput("");
        setPendingImages([]);
        setPendingDocuments([]);
        hydratedRef.current = false;
        router.replace("/qxt-chat");
    }, [isLoggedIn, router]);

    // ========== CALLBACKS ==========

    const clearPendingTimers = useCallback(() => {
        pendingTimersRef.current.forEach((t) => window.clearTimeout(t));
        pendingTimersRef.current = [];
    }, []);

    const stopPendingStage = useCallback(() => {
        clearPendingTimers();
        setPendingStage(null);
        setStageHistory([]);
    }, [clearPendingTimers]);

    const startPendingStage = useCallback(() => {
        clearPendingTimers();
        setPendingStage(null);
        setStageHistory([]);

        const t1 = window.setTimeout(() => {
            if (isMountedRef.current) setPendingStage("thinking");
        }, 200);

        const t2 = window.setTimeout(() => {
            if (isMountedRef.current) {
                setStageHistory((prev) => [...prev, "thinking"]);
                setPendingStage("analyzing");
            }
        }, 700);

        const t3 = window.setTimeout(() => {
            if (isMountedRef.current) {
                setStageHistory((prev) => [...prev, "analyzing"]);
                setPendingStage("searching");
            }
        }, 1200);

        const t4 = window.setTimeout(() => {
            if (isMountedRef.current) {
                setStageHistory((prev) => [...prev, "searching"]);
                setPendingStage("generating");
            }
        }, 1700);

        pendingTimersRef.current = [t1, t2, t3, t4];
    }, [clearPendingTimers]);

    const stopRequest = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setLoading(false);
        setStreaming(false);
        setStreamText("");
        stopPendingStage();
    }, [stopPendingStage]);

    // ========== SESSION CALLBACKS ==========

    const reloadSessionMessages = useCallback(
        async (sid: string) => {
            if (!isMountedRef.current || streaming || loading || sendingRef.current) return;

            try {
                const res = await getSessionMessages(sid);
                const ui: ChatMessage[] = res
                    .filter((m: any) => m.role === "user" || m.role === "assistant")
                    .map((m: any) => {
                        const images = m.payload?.images || m.images || [];
                        const videos = m.payload?.videos || m.videos || [];
                        const audioUrl =
                            m.payload?.audio_url ||
                            m.payload?.audioUrl ||
                            m.audio_url ||
                            m.audioUrl ||
                            null;
                        const documents = Array.isArray(m.payload?.documents)
                            ? m.payload.documents.map((d: any) => ({
                                type: "document" as const,
                                url: d.url || d.file_url,
                                name: d.name || d.filename,
                                size: d.size,
                                mimeType: d.mime_type,
                            }))
                            : [];

                        let kind: ChatMessage["kind"] = "text";
                        if (documents.length > 0) kind = "document";
                        else if (videos.length > 0) kind = "video";
                        else if (images.length > 0) kind = "image";

                        return {
                            id: String(m.id ?? m.request_id ?? crypto.randomUUID()),
                            role: m.role,
                            content: m.content,
                            images: images.length > 0 ? images : undefined,
                            videos: videos.length > 0 ? videos : undefined,
                            documents: documents.length > 0 ? documents : undefined,
                            ...(audioUrl ? { audioUrl: String(audioUrl) } : {}),
                            kind: audioUrl ? "audio" : kind,
                        };
                    });

                if (isMountedRef.current) {
                    setMessages(ui);
                }
            } catch (e: any) {
                if (e?.response?.status === 404 && isMountedRef.current) {
                    setSessionId(null);
                    setMessages([]);
                    router.replace("/qxt-chat");
                }
            }
        },
        [streaming, router]
    );

    const refreshSessions = useCallback(async (): Promise<SessionItem[]> => {
        const token = getStoredToken();
        const workspaceId = getStoredWorkspace();

        if (
            !token ||
            !workspaceId ||
            !isMountedRef.current
        ) {
            console.warn(
                "[refreshSessions] Missing auth/workspace"
            );

            return [];
        }

        try {
            const s = await listSessions();
            if (isMountedRef.current) setSessions(s);
            return s;
        } catch (e) {
            if (isMountedRef.current) setSessions([]);
            return [];
        }
    }, []);

    const fetchWorkspaceTree = useCallback(async (): Promise<WorkspaceTree> => {
        const token = getStoredToken();
        let workspaceId = getStoredWorkspace();

        if (!token) {
            console.warn("[fetchWorkspaceTree] Missing token");
            return { folders: [], unfiled: [] };
        }

        if (!workspaceId) {
            await ensureWorkspaceLoaded();
            workspaceId = getStoredWorkspace();
            if (!workspaceId) {
                console.warn("[fetchWorkspaceTree] Missing workspace after ensure");
                return { folders: [], unfiled: [] };
            }
        }

        try {
            const res = await qxtChatClient.get("/api/v1/workspaces/tree");
            const data = res.data || {};
            return {
                folders: Array.isArray(data.folders) ? data.folders : [],
                unfiled: Array.isArray(data.unfiled) ? data.unfiled : [],
            };
        } catch (e) {
            return { folders: [], unfiled: [] };
        }
    }, []);

    const refreshWorkspace = useCallback(async () => {
        const token = getStoredToken();
        if (!token || !isMountedRef.current) return;

        try {
            setWorkspaceBusy(true);
            const t = await fetchWorkspaceTree();
            console.log("WORKSPACE TREE RAW", t);

            const folders: ProjectFolder[] = (t.folders || []).map((f: any) => ({
                ...f,
                chats: Array.isArray(f.chats) ? f.chats : [],
            }));

            if (isMountedRef.current) {
                setWorkspaceTree({
                    folders,
                    unfiled: Array.isArray(t.unfiled) ? t.unfiled : [],
                });
            }
        } catch (e) {
            if (isMountedRef.current) setWorkspaceTree({ folders: [], unfiled: [] });
        } finally {
            if (isMountedRef.current) setWorkspaceBusy(false);
        }
    }, [fetchWorkspaceTree]);

    const apiCreateProjectFolder = useCallback(async (title: string) => {
        try {
            const res = await qxtChatClient.post("/api/v1/folders", {
                title,
                kind: "project",
            });
            return res.data;
        } catch (e) {
            throw e;
        }
    }, []);

    const apiMoveSessionToFolder = useCallback(
        async (sid: string, folderId: string | null) => {
            try {
                await qxtChatClient.patch(`/api/v1/sessions/${sid}/move`, {
                    folder_id: folderId,
                });
            } catch (e) {
                throw e;
            }
        },
        []
    );

    const apiReorderFolderSessions = useCallback(
        async (folderId: string | null, orderedIds: string[]) => {
            try {
                await qxtChatClient.post("/api/v1/sessions/reorder", {
                    folder_id: folderId,
                    ordered_ids: orderedIds,
                });
            } catch (e) {
                throw e;
            }
        },
        []
    );

    const handleCreateProjectFolder = useCallback(
        async (title?: string) => {
            const token = getStoredToken();
            if (!token) {
                setAuthOpen(true);
                return;
            }

            const name = (title ?? "").trim();
            if (!name) return;

            try {
                setWorkspaceBusy(true);
                await apiCreateProjectFolder(name);
                await refreshWorkspace();
            } catch (e) {
                alert("Could not create folder.");
            } finally {
                setWorkspaceBusy(false);
            }
        },
        [apiCreateProjectFolder, refreshWorkspace]
    );

    const handleMoveSessionToFolder = useCallback(
        async (sid: string, folderId: string | null) => {
            const token = getStoredToken();
            if (!token) {
                setAuthOpen(true);
                return;
            }

            try {
                setWorkspaceBusy(true);
                await apiMoveSessionToFolder(String(sid), folderId);
                await refreshWorkspace();
                await refreshSessions();
            } catch (e) {
                //
            } finally {
                setWorkspaceBusy(false);
            }
        },
        [apiMoveSessionToFolder, refreshWorkspace, refreshSessions]
    );

    const handleReorderFolderSessions = useCallback(
        async (folderId: string | null, orderedIds: string[]) => {
            const token = getStoredToken();
            if (!token) return;

            try {
                await apiReorderFolderSessions(folderId, orderedIds);
            } catch (e) {
                //
            }
        },
        [apiReorderFolderSessions]
    );

    const openSession = useCallback(
        async (sid: string) => {
            stopRequest();
            hydratedRef.current = false;
            if (isMountedRef.current) {
                setSessionId(sid);
                router.replace(`/qxt-chat?sid=${sid}`);
            }
        },
        [router, stopRequest]
    );

    const handleDeleteSession = useCallback(
        async (sid: string) => {
            try {
                await deleteSession(sid);
                await ensureWorkspaceLoaded();
                const s = await refreshSessions();
                await refreshWorkspace();

                if (sessionId === sid && isMountedRef.current) {
                    setMessages([]);

                    if (s.length > 0) {
                        const first = String((s[0] as any).id);
                        setSessionId(first);
                        hydratedRef.current = false;
                        await reloadSessionMessages(first);
                    } else {
                        const created = await createWorkspaceSession();
                        setSessionId(created.id);
                        hydratedRef.current = false;
                        router.replace(`/qxt-chat?sid=${created.id}`);
                        setMessages([]);
                        await refreshSessions();
                        await refreshWorkspace();
                    }
                }
            } catch (e) {
                //
            }
        },
        [sessionId, refreshSessions, refreshWorkspace, reloadSessionMessages, router]
    );

    const handleNewChatInFolder = useCallback(
        async (folderId: string | null) => {
            const token = getStoredToken();
            if (!token) {
                setAuthOpen(true);
                return;
            }

            stopRequest();
            setMessages([]);
            setReactions({});
            setCopiedIndex(null);
            setExpandedMsgs({});
            setEditingIndex(null);
            setEditingText("");
            setInput("");
            setPendingImages([]);
            setPendingDocuments([]);
            limitReachedRef.current = false;
            hydratedRef.current = false;

            try {
                const created = await createWorkspaceSession({ folder_id: folderId });
                if (isMountedRef.current) {
                    setSessionId(created.id);
                    router.replace(`/qxt-chat?sid=${created.id}`);
                }
                await refreshSessions();
                await refreshWorkspace();
            } catch (e) {
                //
            }
        },
        [router, refreshSessions, refreshWorkspace, stopRequest]
    );

    const handleNewChat = useCallback(async () => {
        const token = getStoredToken();
        if (!token) {
            setSessionId(null);
            hydratedRef.current = false;
            router.replace("/qxt-chat");
            return;
        }

        stopRequest();
        setMessages([]);
        setReactions({});
        setCopiedIndex(null);
        setExpandedMsgs({});
        setEditingIndex(null);
        setEditingText("");
        setInput("");
        setPendingImages([]);
        setPendingDocuments([]);
        limitReachedRef.current = false;
        hydratedRef.current = false;

        try {
            const s = await createWorkspaceSession();
            if (isMountedRef.current) {
                setSessionId(s.id);
                router.replace(`/qxt-chat?sid=${s.id}`);
            }
            await refreshSessions();
            await refreshWorkspace();
        } catch (e) {
            setSessionId(null);
            hydratedRef.current = false;
            router.replace("/qxt-chat");
        }
    }, [router, refreshSessions, refreshWorkspace, stopRequest]);

    const openRenameDialog = useCallback(
        (sid: string) => {
            const current = sessions.find((x) => String(x.id) === String(sid))?.title ?? "Chat";
            setRenameSid(String(sid));
            setRenameDraft((current || "").toString());
            setRenameOpen(true);
        },
        [sessions]
    );

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
            await qxtChatClient.patch(`/api/v1/sessions/${renameSid}/rename`, {
                title,
            });
            await refreshSessions();
            await refreshWorkspace();
            closeRenameDialog();
        } catch (e) {
            alert("Could not rename.");
        }
    }, [renameSid, renameDraft, refreshSessions, refreshWorkspace, closeRenameDialog]);

    const ensureSession = useCallback(async () => {
        if (sessionId) {
            return sessionId;
        }

        const created = await createWorkspaceSession();
        const sid = (created as any)?.id;

        if (!sid) {
            throw new Error("Session creation failed");
        }

        if (isMountedRef.current) {
            setSessionId(sid);
            router.replace(`/qxt-chat?sid=${sid}`);
        }

        return sid;
    }, [sessionId, router]);

    // ========== MESSAGE CALLBACKS ==========

    const handleCopy = useCallback((text: string, idx: number) => {
        if (!navigator?.clipboard) return;
        navigator.clipboard
            .writeText(text)
            .then(() => {
                setCopiedIndex(idx);
                setTimeout(() => setCopiedIndex(null), 1200);
            })
            .catch(() => {
                //
            });
    }, []);

    const handleReaction = useCallback((idx: number, r: Reaction) => {
        setReactions((prev) => ({
            ...prev,
            [idx]: prev[idx] === r ? null : r,
        }));
    }, []);

    const handleShare = useCallback(async (text: string) => {
        try {
            if (navigator?.share) {
                await navigator.share({ text });
            } else if (navigator?.clipboard) {
                await navigator.clipboard.writeText(text);
            }
        } catch (e) {
            //
        }
    }, []);

    const handleReport = useCallback((text: string) => {
        alert("Report submitted:\n\n" + text);
    }, []);

    const isLongText = useCallback((s: any) => {
        const text = typeof s === "string" ? s : String(s ?? "");
        return text.length > 900 || text.split("\n").length > 14;
    }, []);

    const clampText = useCallback((s: any) => {
        const text = typeof s === "string" ? s : String(s ?? "");
        const lines = text.split("\n");
        if (lines.length > 14) return lines.slice(0, 14).join("\n") + "\n...";
        if (text.length > 900) return text.slice(0, 900) + "...";
        return text;
    }, []);

    const startEdit = useCallback((idx: number, original: string) => {
        setEditingIndex(idx);
        setEditingText(original);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingIndex(null);
        setEditingText("");
    }, []);

    const saveEdit = useCallback(() => {
        if (editingIndex == null) return;
        const v = editingText.trim();
        if (!v) return;

        setMessages((prev) =>
            prev.map((m, i) => (i === editingIndex ? { ...m, content: v } : m))
        );

        setEditingIndex(null);
        setEditingText("");
    }, [editingIndex, editingText]);

    // ========== SEND MESSAGE ==========

    const sendMessage = useCallback(
        async (payload?: {
            text: string;
            model?: string;
            isVoiceActive?: boolean;
            injectedMessage?: ChatMessage;
            images?: string[];
            files?: any[];
        }) => {
            const isVoice = payload?.isVoiceActive ?? false
            if (isVoice) return;

            if (sendingRef.current || !isMountedRef.current) return;

            const userMessage = (payload?.text ?? input ?? "").trim();
            const hasImages = !!payload?.images?.length;
            const hasFiles = !!payload?.files?.length;

            if ((!userMessage && !hasImages && !hasFiles && !isVoice) || loading || streaming || limitReachedRef.current) return;

            const token = getStoredToken();
            if (!token) {
                setAuthOpen(true);
                return;
            }

            if (!models.length) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant" as const,
                        content: "⏳ Models are still loading, try again in a second.",
                        kind: "text" as const,
                    },
                ]);
                return;
            }

            const finalModel = payload?.model || selected?.id;
            if (!finalModel) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant" as const,
                        content: "⚠️ No model selected.",
                        kind: "text" as const,
                    },
                ]);
                return;
            }

            sendingRef.current = true;
            setInput("");
            setLoading(true);
            setStreamText("");
            startPendingStage();
            setStreaming(true);

            try {
                if (!isVoice) {
                    const newUserMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "user",
                        content: userMessage,
                        kind: hasFiles ? "document" : hasImages ? "image" : "text",
                        images: hasImages ? payload?.images : undefined,
                        documents: hasFiles ? payload?.files : undefined,
                    };

                    setMessages((prev) => {
                        const updated = [...prev, newUserMsg];
                        messagesRef.current = updated; // 🔥 أهم سطر
                        return updated;
                    });
                }

                const workspaceId = getStoredWorkspace();
                if (!workspaceId) {
                    throw new Error("Workspace not loaded");
                }

                const sid = await ensureSession();
                if (!sid) throw new Error("Session creation failed");

                if (abortRef.current) abortRef.current.abort();
                abortRef.current = new AbortController();

                const updatedMessages: ChatMessage[] = payload?.injectedMessage
                    ? [...messagesRef.current, payload.injectedMessage]
                    : isVoice
                        ? [...messagesRef.current]
                        : [...messagesRef.current];

                // تنظيف الرسائل قبل الإرسال
                const cleanMessages = updatedMessages
                    .filter(
                        (m) =>
                            m &&
                            m.role &&
                            ["user", "assistant", "system"].includes(m.role) &&
                            (
                                (m.content && String(m.content).trim().length > 0) ||
                                (m.images && m.images.length > 0) ||
                                (m.documents && m.documents.length > 0)
                            )
                    )
                    .map((m) => ({
                        role: m.role,
                        content: String(m.content ?? ""),
                        has_media:
                            (m.images && m.images.length > 0) ||
                            (m.documents && m.documents.length > 0),
                        payload: {
                            images: m.images || [],
                            videos: m.videos || [],
                            documents: m.documents || [],
                            audio_url: m.audioUrl || null,
                        }
                    }));

                // تقليل الهستوري
                const trimmedMessages = cleanMessages.slice(-20);


                const requestPayload = {
                    model: finalModel,
                    session_id: sid,
                    messages: trimmedMessages,
                    stream: true,
                };


                const response = await fetch(`${API_BASE}/api/v1/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        ...(workspaceId ? { "X-Workspace-ID": workspaceId } : {})
                        // أو استخدم X-Company-ID لو الباك يفضله:
                        // ...(workspaceId ? { "X-Company-ID": workspaceId } : {})
                    },
                    signal: abortRef.current.signal,
                    body: JSON.stringify(requestPayload),
                });

                if (!response.ok) {
                    const raw = await response.clone().text();
                    throw new Error(raw || `API error ${response.status}`);
                }

                if (!response.body) throw new Error("No response body");

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");

                let buffer = "";
                let fullText = "";
                let assistantAdded = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    let boundary;

                    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
                        const chunk = buffer.slice(0, boundary).trim();
                        buffer = buffer.slice(boundary + 2);

                        if (!chunk.startsWith("data:")) continue;

                        const data = chunk.replace("data:", "").trim();
                        if (!data || data === "[DONE]") continue;

                        try {
                            const json = JSON.parse(data);
                            const images =
                                json?.choices?.[0]?.delta?.payload?.images ||
                                json?.payload?.images ||
                                [];

                            if (images && images.length > 0) {
                                // امسح أي streaming text
                                setStreamText("");


                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        role: "assistant",
                                        content: "",
                                        images: images,
                                        kind: "image",
                                        id: crypto.randomUUID(),
                                    },
                                ]);

                                continue;
                            }

                            const delta = json?.choices?.[0]?.delta?.content;
                            if (!delta) continue;

                            fullText += delta;
                            setStreamText(fullText);

                            if (!assistantAdded) {
                                assistantAdded = true;
                                setMessages((prev) => {
                                    const newMsg = {
                                        id: crypto.randomUUID(),
                                        role: "assistant" as const,
                                        content: delta,
                                        kind: "text" as const,
                                    };

                                    const updated = [...prev, newMsg];
                                    messagesRef.current = updated; // 🔥 مهم
                                    return updated;
                                });
                            } else {
                                setMessages((prev) => {
                                    if (!prev.length) return prev;

                                    const last = prev[prev.length - 1];
                                    if (!last || last.role !== "assistant") return prev;

                                    const updated = [
                                        ...prev.slice(0, -1),
                                        {
                                            ...last,
                                            content: last.content + delta,
                                        },
                                    ];

                                    messagesRef.current = updated; // 🔥 مهم
                                    return updated;
                                });
                            }
                        } catch (e) { }
                    }
                }

                reader.releaseLock();
                setStreaming(false);
                setStreamText("");
                stopPendingStage();
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant" as const,
                            content: `❌ ${error?.message || "An error occurred"}`,
                            kind: "text" as const,
                        },
                    ]);
                }

                setStreaming(false);
                setStreamText("");
                stopPendingStage();
            } finally {
                sendingRef.current = false;
                setLoading(false);
            }
        },
        [input, loading, streaming, selected, models, startPendingStage, stopPendingStage, ensureSession, router]
    );

    // ========== HYDRATION ==========

    useEffect(() => {
        if (loadingUser) return;

        const token = getStoredToken();
        if (!token) return;

        refreshWorkspace();
    }, [loadingUser, refreshWorkspace]);

    const sidParam = sp.get("sid");

    useEffect(() => {
        if (loadingUser) return;
        if (streaming || sendingRef.current) return;
        // ✅ FIX 3: Check if already hydrated
        if (hydratedRef.current) return;

        const token = getStoredToken();
        if (!token) return;

        let cancelled = false;

        async function hydrate() {

            await loadBusinessState();

            let workspaceId = getStoredWorkspace();

            if (!workspaceId) {
                await ensureWorkspaceLoaded();
                workspaceId = getStoredWorkspace();
                if (!workspaceId) {
                    console.warn("[hydrate] Workspace not ready yet");
                    return;
                }
            }

            try {
                const s = await refreshSessions();
                await refreshWorkspace();

                if (cancelled || !isMountedRef.current) return;

                if (sidParam) {
                    const exists = s.some((x: any) => String(x.id) === String(sidParam));

                    if (exists) {
                        // ✅ Only set if not streaming
                        if (!streaming) {
                            setSessionId(sidParam);
                            await reloadSessionMessages(sidParam);
                            hydratedRef.current = true;
                        }
                        return;
                    }

                    const created = await createWorkspaceSession();
                    setSessionId(created.id);
                    router.replace(`/qxt-chat?sid=${created.id}`);
                    hydratedRef.current = true;
                    return;
                }

                if (s.length > 0) {
                    const first = String((s[0] as any).id);
                    // ✅ Only set if not streaming
                    if (!streaming) {
                        setSessionId(first);
                        await reloadSessionMessages(first);
                        hydratedRef.current = true;
                    }
                    return;
                }

                const created = await createWorkspaceSession();
                if (cancelled || !isMountedRef.current) return;

                setSessionId(created.id);
                router.replace(`/qxt-chat?sid=${created.id}`);
                setMessages([]);
                await refreshSessions();
                await refreshWorkspace();
                hydratedRef.current = true;
            } catch (e) {
                //
            }
        }

        hydrate();

        return () => {
            cancelled = true;
        };
    }, [loadingUser, sidParam, router, refreshSessions, refreshWorkspace, reloadSessionMessages, streaming, loadBusinessState]);

    // ========== LAYOUT ==========
    const modelOptions = useMemo(
        () => models.map((m) => ({ id: m.id, label: m.public_name })),
        [models]
    );

    const CHAT_WIDTH = "max-w-[740px] w-full";
    const DOCK_PB = "pb-[280px] md:pb-[300px]";
    const contentShift = sidebarOpen ? "lg:-translate-x-8" : "";
    const contentWrap = `${CHAT_WIDTH} mx-auto ${contentShift} transition-transform duration-300`;

    const footerProps = useMemo(
        () => ({
            input,
            loading: loading || streaming,
            lang,
            darkMode,
            placeholder: loadingUser ? "Loading session..." : typedPlaceholder,
            sessionId,
            onChange: (val: string) => setInput(val),

            onSend: async (data: {
                text: string;
                model: string;
                isVoiceActive?: boolean;
                images?: string[];
                files?: any[];
            }) => {
                return await sendMessage({
                    text: data.text,
                    model: data.model,
                    isVoiceActive: data.isVoiceActive,
                    images: data.images,   // ✅ مهم
                    files: data.files,     // ✅ مهم
                });
            },

            onSessionChange: async (id: string) => {
                if (id === "NEED_SESSION") {
                    const s = await createWorkspaceSession()
                    setSessionId(s.id)
                    router.replace(`/qxt-chat?sid=${s.id}`)
                    await refreshSessions()
                    await refreshWorkspace()
                    return s.id // ✅ مهم
                } else {
                    setSessionId(id)
                    return id
                }
            },

            onStop: stopRequest,
            pendingImages,
            setPendingImages,
            pendingDocuments,
            setPendingDocuments,


            selectedModel: selected
                ? {
                    id: selected.id,
                    label: models.find((m) => m.id === selected.id)?.public_name || selected.id,
                }
                : null,

            models: modelOptions,

            onModelChange: (model: { id: string; label: string }) => {
                selectModel(model.id);
            },

            // ✅ في onVoiceMessage - اضف هذا الـ FIX:

            onVoiceMessage: (data: VoiceMessagePayload) => {
                const id = (data as any).id as string | undefined
                if (!id) return

                const kind = (data as any).kind as string | undefined
                const text = (data as any).text as string | undefined
                const audioUrl = (data as any).audioUrl as string | undefined

                // ✅ Cancel marker: remove the user + assistant temp bubbles
                // ✅ Cancel marker: remove all temp bubbles for this voice turn
                if (text === "__VOICE_CANCEL__") {
                    const base = id.startsWith("assistant-") ? id.replace(/^assistant-/, "") : id;

                    setMessages((prev) => {
                        const filtered = prev.filter((m: any) => {
                            const mid = (m as any).id;
                            const role = (m as any).role;
                            const kind2 = (m as any).kind;
                            const content = String((m as any).content ?? "");

                            // remove the pair for this voice turn
                            if (mid === base) return false;
                            if (mid === `assistant-${base}`) return false;

                            // remove any temp system/waiting message (common in voice flows)
                            if (role === "system" && (kind2 === "stream_update" || kind2 === "text") && content.trim() === "")
                                return false;

                            if (role === "system" && content.includes("Processing voice")) return false;
                            if (role === "system" && content.includes("جاري معالجة الصوت")) return false;

                            return true;
                        });

                        messagesRef.current = filtered;
                        return filtered;
                    });

                    return;
                }

                setMessages((prev) => {
                    const updated = [...prev]
                    const idx = updated.findIndex((m: any) => (m as any).id === id)

                    const prevMsg = idx !== -1 ? (updated[idx] as any) : null

                    const next: ChatMessage = {
                        // احتفظ بأي حاجات قديمة (images/videos/docs…)
                        ...(prevMsg || {}),
                        id,
                        role: data.role,
                        kind: (kind as any) || (prevMsg?.kind ?? "text"),
                        content:
                            typeof text === "string"
                                ? text
                                : (prevMsg?.content ?? ""),
                        // لو عندك audioUrl في النوع بتاع ChatMessage
                        ...(audioUrl ? { audioUrl } : {}),
                    } as any

                    if (idx === -1) updated.push(next)
                    else updated[idx] = next

                    messagesRef.current = updated
                    return updated
                })
            },


            onQuotaExceeded: () => {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant" as const,
                        content: "🚫 Daily free limit reached (3/3). Please upgrade.",
                        kind: "upgrade" as const,
                    },
                ]);
                setUpgradeOpen(true);
                limitReachedRef.current = true;
            },
        }),
        [
            input,
            loading,
            streaming,
            lang,
            darkMode,
            loadingUser,
            typedPlaceholder,
            pendingImages,
            pendingDocuments,
            sendMessage,
            stopRequest,
            selected,
            models,
            selectModel,
            modelOptions,
            sessionId,
            refreshSessions,
            refreshWorkspace,
        ]
    );

    // ========== RENDER ==========

    return (
        <div className={`relative min-h-screen overflow-hidden ${rootBG}`} dir="ltr">
            <div className={`pointer-events-none absolute inset-0 -z-10 opacity-45 ${overlayGrid}`} />

            <div className={`absolute inset-0 flex flex-row ${baseText}`}>
                {/* SIDEBAR */}
                <ChatSidebar
                    darkMode={darkMode}
                    open={sidebarOpen}
                    onToggleThemeAction={() => setDarkMode((v) => !v)}
                    onNewChatAction={handleNewChat}
                    onCloseAction={() => setSidebarOpen(false)}
                    isLoggedIn={isLoggedIn}
                    userName={userName}
                    userEmail={user?.email || null}
                    onAccountClickAction={() => setAuthOpen(true)}
                    sessions={sessions}
                    activeSessionId={sessionId}
                    onOpenSessionAction={openSession}
                    onDeleteSessionAction={handleDeleteSession}
                    onNewChatInFolderAction={handleNewChatInFolder}
                    onRenameSessionAction={(sid) => openRenameDialog(String(sid))}
                    onCopySessionLinkAction={(sid) => {
                        if (typeof window !== "undefined") {
                            navigator.clipboard?.writeText(`${window.location.origin}/qxt-chat?sid=${sid}`);
                        }
                    }}
                    projectFolders={workspaceTree.folders}
                    unfiledSessions={workspaceTree.unfiled}
                    onCreateProjectFolderAction={(title) => handleCreateProjectFolder(title)}
                    onMoveSessionToFolderAction={handleMoveSessionToFolder}
                    onReorderFolderSessionsAction={handleReorderFolderSessions}
                    workspaceBusy={workspaceBusy}
                />

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col min-w-0">
                    <ChatHeader
                        conversationId={sessionId}
                        sessionTitle={activeSessionTitle}
                        sessionKind="chat"
                        apiVersion="v1"
                        lang={lang}
                        sidebarOpen={sidebarOpen}
                        darkMode={darkMode}
                        onToggleSidebar={() => setSidebarOpen((v) => !v)}
                        onCopyLink={() => {
                            if (typeof window !== "undefined" && sessionId) {
                                navigator.clipboard?.writeText(`${window.location.origin}/qxt-chat?sid=${sessionId}`);
                            }
                        }}
                        onNativeShare={async () => {
                            if (typeof window === "undefined" || !sessionId) return;
                            const url = `${window.location.origin}/qxt-chat?sid=${sessionId}`;
                            if (navigator.share) await navigator.share({ url, title: "ChatQXT" });
                            else await navigator.clipboard?.writeText(url);
                        }}
                        onRenameSession={() => {
                            if (!sessionId) return;
                            openRenameDialog(String(sessionId));
                        }}
                        onDeleteSession={() => {
                            if (sessionId) handleDeleteSession(String(sessionId));
                        }}
                    />

                    <main className={`flex-1 overflow-y-auto px-3 py-4 ${composerMode === "bottom" ? DOCK_PB : "pb-10"} ${scrollClasses}`}>
                        <div className={contentWrap}>
                            {!conversationStarted ? (
                                <div className="min-h-[calc(100vh-260px)] flex flex-col items-center justify-center text-center gap-5">
                                    <div>
                                        <h1 className={`text-2xl font-semibold mb-2 ${darkMode ? "text-emerald-100" : "text-cyan-50"}`}>
                                            {welcomeTitle}
                                        </h1>
                                        <p className={`text-sm max-w-xl mx-auto ${darkMode ? "text-emerald-200/80" : "text-cyan-100/80"}`}>
                                            {welcomeBody}
                                        </p>
                                    </div>

                                    {composerMode === "center" && (
                                        <div className="w-full">
                                            <ChatFooter {...footerProps} />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <ChatMessages
                                    messages={messages}
                                    lang={lang}
                                    assistantName={assistantName}
                                    darkMode={darkMode}
                                    messageDir={messageDir}
                                    messageTextAlign={messageTextAlign}
                                    copiedIndex={copiedIndex}
                                    reactions={reactions}
                                    expandedMsgs={expandedMsgs}
                                    setExpandedMsgs={setExpandedMsgs}
                                    editingIndex={editingIndex}
                                    editingText={editingText}
                                    setEditingText={setEditingText}
                                    cancelEdit={cancelEdit}
                                    saveEdit={saveEdit}
                                    startEdit={startEdit}
                                    handleCopy={handleCopy}
                                    handleReaction={handleReaction}
                                    handleShare={handleShare}
                                    handleReport={handleReport}
                                    isLongText={isLongText}
                                    clampText={clampText}
                                    busy={busy}
                                    streaming={streaming}
                                    pendingStage={pendingStage}
                                    stageHistory={stageHistory}
                                    bottomRef={bottomRef}
                                />
                            )}
                        </div>
                    </main>

                    {conversationStarted && (
                        <div className="sticky bottom-0 z-50 w-full flex justify-center">
                            <div className="w-full max-w-[740px] px-4">
                                <ChatFooter {...footerProps} />
                            </div>
                        </div>
                    )}

                    <UpgradeModal
                        open={upgradeOpen}
                        onClose={() => setUpgradeOpen(false)}
                        onUpgrade={async (planId) => {
                            const res = await fetch(`${API_BASE}/api/v1/billing/subscribe`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ plan_id: planId }),
                            });

                            const data = await res.json();
                            if (data?.checkout_url) {
                                window.location.href = data.checkout_url;
                            }
                        }}
                    />

                    <RenameDialog
                        open={renameOpen}
                        darkMode={darkMode}
                        renameDraft={renameDraft}
                        setRenameDraftAction={setRenameDraft}
                        closeRenameDialogAction={closeRenameDialog}
                        submitRenameDialogAction={submitRenameDialog}
                    />

                    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} lang={lang} />
                </div>
            </div>
        </div>
    );
}