export type AgentCapability =
    | "web"
    | "vision"
    | "files"
    | "memory"
    | "voice"
    | "code"
    | "workspace";

export type AgentVisibility =
    | "public"
    | "private"
    | "workspace";

export type AgentStatus =
    | "active"
    | "draft"
    | "disabled";

export interface Agent {

    id: string;

    slug: string;

    name: string;

    role: string;

    description?: string | null;

    avatar?: string | null;

    icon?: string | null;

    model?: string | null;

    system_prompt?: string | null;

    temperature?: number | null;

    visibility?: AgentVisibility;

    status?: AgentStatus;

    capabilities?: AgentCapability[];

    memory_enabled?: boolean;

    workspace_id?: string | null;

    created_at?: string;

    updated_at?: string;
}

export interface AgentRuntime {

    agent: Agent;

    model: string;

    systemPrompt: string;

    temperature: number;

    capabilities: AgentCapability[];

    memoryEnabled: boolean;
}