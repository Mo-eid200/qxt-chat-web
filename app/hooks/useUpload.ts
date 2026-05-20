import { useRef, useState, useCallback } from "react";
import { uploadFileRequest, type UploadResult } from "../lib/api/upload";

export function useUpload(token: string) {
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    const controllerRef = useRef<AbortController | null>(null);

    const upload = useCallback(
        async (file: File, extra?: { folder?: string }): Promise<UploadResult | null> => {
            if (!file) return null;

            setUploading(true);
            setProgress(0);

            controllerRef.current?.abort();
            controllerRef.current = new AbortController();

            try {
                const res = await uploadFileRequest(
                    file,
                    token,
                    (p) => setProgress(p),
                    controllerRef.current.signal,
                    extra
                );
                return res;
            } finally {
                setUploading(false);
                setProgress(0);
                controllerRef.current = null;
            }
        },
        [token]
    );

    const cancel = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
        setUploading(false);
        setProgress(0);
    }, []);

    return { upload, cancel, progress, uploading };
}