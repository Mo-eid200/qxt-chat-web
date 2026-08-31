type GetChatRouteParams = {
  sessionId?: string | null;
  agentId?:   string | null;
};

function normalize(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function getChatRoute({
  sessionId,
  agentId,
}: GetChatRouteParams = {}): string {
  const sid = normalize(sessionId);

  // ✅ مش بنبني URL منفصل للـ agent
  // الـ agent بيتحكم فيه AgentRuntimeContext مش URL
  const base = "/qxt-chat";

  if (!sid) {
    // لو المستخدم أصلاً واقف على الدومين الرئيسي (/) اللي بيعرض
    // محتوى /qxt-chat عن طريق rewrite، سيبه على / ومتغيرش شريط
    // العنوان لـ /qxt-chat — المحتوى نفسه أصلاً واحد.
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      return "/";
    }
    return base;
  }
  return `${base}?sid=${encodeURIComponent(sid)}`;
}