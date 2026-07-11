import { qxtApiClient } from "../core/qxtClient";

/* =========================================================
   TYPES
========================================================= */

export type ImageGeneratePayload = {
  prompt: string;
  size: string;
  steps: number;
  guidance: number;
  seed?: string;
  provider?: string;
};

export type VideoGeneratePayload = {
  prompt: string;
  provider?: string;
};

/* =========================================================
   IMAGE
========================================================= */

export async function generateImage(payload: ImageGeneratePayload) {
  const res = await qxtApiClient.post(
    "/api/v1/images/generate",
    payload
  );
  return res.data;
}

export async function getImageJob(jobId: string) {
  const res = await qxtApiClient.get(
    `/api/v1/images/jobs/${jobId}`
  );
  return res.data;
}

/* =========================================================
   VIDEO
========================================================= */

export async function generateVideo(payload: VideoGeneratePayload) {
  const res = await qxtApiClient.post(
    "/api/v1/videos/generate",
    payload
  );
  return res.data;
}

export async function getVideoJob(jobId: string) {
  const res = await qxtApiClient.get(
    `/api/v1/videos/jobs/${jobId}`
  );
  return res.data;
}

/* =========================================================
   OCR
========================================================= */

export async function runOCR(formData: FormData) {
  const res = await qxtApiClient.post(
    "/api/v1/ocr/generate",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return res.data;
}
