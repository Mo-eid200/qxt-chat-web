import { API_BASE } from "../config";

export type UploadResult = {
    url: string;
    kind: "image" | "video" | "audio" | "document" | "other";
    folder?: "images" | "videos" | "audio" | "documents" | "general";
    content_type?: string;
    bytes?: number;
    sha256?: string;
    filename?: string;
    metadata?: any;
    upload_time_ms?: number;
    dedup?: boolean;
};

export async function uploadFileRequest(
    file: File,
    token: string,
    onProgress?: (p: number) => void,
    signal?: AbortSignal,
    extra?: { folder?: string }
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        const url = `${API_BASE}/api/v1/upload`;
        xhr.open("POST", url);

        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.timeout = 120000;

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
        };

        xhr.onload = () => {
            const text = xhr.responseText || "";
            let body: any = text;

            try {
                body = text ? JSON.parse(text) : {};
            } catch {
                body = { raw: text };
            }

            if (xhr.status >= 200 && xhr.status < 300) resolve(body);
            else reject({ status: xhr.status, body });
        };

        xhr.onerror = () => reject({ status: xhr.status || 0, body: "network_error" });
        xhr.ontimeout = () => reject({ status: 408, body: "timeout" });

        if (signal) {
            signal.addEventListener(
                "abort",
                () => {
                    xhr.abort();
                    reject({ status: 0, body: "aborted" });
                },
                { once: true }
            );
        }

        const formData = new FormData();
        formData.append("file", file);

        if (extra?.folder) formData.append("folder", extra.folder);

        xhr.send(formData);
    });
}