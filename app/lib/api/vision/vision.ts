import { qxtApiClient } from "../core/qxtClient";

/* =========================
   IMAGE
========================= */

export async function generateImage(payload: {
  prompt: string;
  size?: string;
  steps?: number;
  guidance?: number;
  seed?: string;
  provider?: string;
  num_outputs?: number;
}) {
  const { data } = await qxtApiClient.post("/iris-images/generate", payload);
  return data;
}

export async function getImageJob(jobId: string) {
  const { data } = await qxtApiClient.get(`/iris-images/jobs/${jobId}`);
  return data;
}

/* =========================
   VIDEO
========================= */

export async function generateVideo(payload: {
  prompt: string;
  provider?: string;
  length?: number;
  steps?: number;
  target_size?: number;
  cfg?: number;
  image?: string;
}) {
  const { data } = await qxtApiClient.post("/iris-video/generate", payload);
  return data;
}

export async function getVideoJob(jobId: string) {
  const { data } = await qxtApiClient.get(`/iris-video/jobs/${jobId}`);
  return data;
}

/* =========================
   OCR / DOC
========================= */

export async function runOCR(formData: FormData) {
  const { data } = await qxtApiClient.post("/iris-ocr/generate", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
