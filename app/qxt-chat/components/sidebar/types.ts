// app/qxt-chat/components/sidebar/types.ts
export type SessionItem = {
    id: string;
    title?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
};

export type VisionKey = "image_generator" | "design_branding" | "ocr_analysis";

export type ProjectFolder = {
    id: string;
    title: string;
    kind?: "project" | "library" | "code" | "root";
    sort_index?: number;
    chats?: SessionItem[];
    folder_id?: string | null;
};

// أضِف هذا السطر أسفل كل الأنواع الأخرى:
export type SectionKey = "root" | "projects" | "library" | "code";