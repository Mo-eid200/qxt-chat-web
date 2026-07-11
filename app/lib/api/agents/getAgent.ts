import {
    qxtChatClient,
} from "@/app/lib/api/core/qxtClient";

import type {
    Agent,
} from "../../../types/agent";

export async function getAgent(
    agentId: string,
): Promise<Agent> {

    if (!agentId) {

        throw new Error(
            "Agent id is required"
        );
    }

    try {

        const response =
            await qxtChatClient.get(
                `/api/v1/console/agents/${agentId}`
            );

        const data =
            response.data;

        if (!data?.id) {

            throw new Error(
                "Invalid agent payload"
            );
        }

        return {

            id:
                String(data.id),

            slug:
                String(data.id),

            name:
                String(
                    data.name || ""
                ),

            role:
                String(
                    data.role || ""
                ),

            description:
                String(
                    data.description || ""
                ),

            avatar:
                null,

            icon:
                data.icon || "cpu",

            model:
                data.model || null,

            system_prompt:
                data.system_prompt || "",

            temperature:
                typeof data.temperature
                === "number"
                    ? data.temperature
                    : 0.7,

            visibility:
                data.visibility || "private",

            status:
                data.status || "idle",

            capabilities:
                [],

            memory_enabled:
                false,

            workspace_id:
                null,

            created_at:
                data.created_at
                || new Date().toISOString(),

            updated_at:
                data.updated_at
                || null,
        };

    } catch (error: any) {

        console.error(
            "[getAgent]",
            error
        );

        throw new Error(

            error?.response?.data?.detail
            || "Failed to load agent"
        );
    }
}