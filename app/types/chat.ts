export type ChatRole = "user" | "assistant";
export type Reaction = "up" | "down" | null;

export interface ChatMessage {
  id?: string;

  role: ChatRole;

  content: string;

  audioUrl?: string;

  images?: string[];

  videos?: string[];
  documents?: any[];

  payload?: {
    type?: "text" | "image" | "video" | "audio";

    images?: string[];
    videos?: string[];

    prompt?: string;
  };

  kind?:
  | "image"
  | "video"
  | "text"
  | "audio"
  | "upgrade"
  | "recording"
  | "document"
  | "stream_update"
  | "audio_update";
}

export type PendingStage =
  | "thinking"
  | "analyzing"
  | "searching"
  | "generating"
  | null;
export type AIStage =
  | "thinking"
  | "analyzing"
  | "searching"
  | "generating";
export type VoiceMessagePayload = {
  text?: string;
  audioUrl?: string;
  role: "user" | "assistant";
};