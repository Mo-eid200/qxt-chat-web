export type SessionScope =
  | "personal"
  | "workspace";

export type SessionKind =
  | "chat"
  | "workspace"
  | "agent";

export type SessionItem = {
  id: string;
  owner_user_id?: number;
  title?: string | null;

  kind?: SessionKind;
  scope?: SessionScope;

  workspace_id?: string | null;
  agent_id?: string | null;
  folder_id?: string | null;

  pinned?: boolean;
  starred?: boolean;
  marked_unread?: boolean;
  sort_index?: number;

  messages_count?: number;
  last_message?: string | null;

  is_agent_session?: boolean;

  updated_at?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

export type VisionKey =
  | "image_generator"
  | "design_branding"
  | "ocr_analysis";

export type ProjectFolder = {
  id: string;
  title: string;
  kind?: "project";
  sort_index?: number;
  chats?: SessionItem[];
  folder_id?: string | null;
};

export type SectionKey =
  | "root"
  | "projects"
  | "library"
  | "code";