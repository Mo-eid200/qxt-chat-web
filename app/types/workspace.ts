import type { SessionItem } from "../qxt-chat/components/sidebar/types";

export type ProjectFolder = {
  id: string;
  title: string;
  kind?: "project" | "library" | "code" | "root";
  sort_index?: number;
  chats?: SessionItem[];
};

export type WorkspaceTree = {
  folders: ProjectFolder[];
  unfiled: SessionItem[];
};