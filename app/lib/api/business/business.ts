import { qxtChatClient } from "../core/qxtClient";

export async function getBusinessMe() {
    const res = await qxtChatClient.get(
        "/api/v1/business/me"
    );

    return res.data;
}