"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { env } from "@/lib/env";
import type { UploadedPhoto } from "./schemas";

export const MAX_PHOTOS = 6;
const MAX_INPUT_BYTES = 25 * 1024 * 1024; // refuse absurd originals before decoding
const MAX_EDGE = 1600;

export const photoUploadsEnabled = () => env.uploadApiUrl !== "";

/** Basic checks on a user-picked file. Returns an error message, or null when acceptable. */
export function validatePhoto(file: File): string | null {
  if (!file.type.startsWith("image/")) return `${file.name} isn't an image.`;
  if (file.size > MAX_INPUT_BYTES) return `${file.name} is too large (max 25 MB).`;
  return null;
}

/** Resize to at most 1600px on the long edge and re-encode (WebP, JPEG fallback). EXIF orientation is applied. */
export async function compressPhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't process the image.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const toBlob = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    const blob = (await toBlob("image/webp", 0.82)) ?? (await toBlob("image/jpeg", 0.85));
    if (!blob) throw new Error("Couldn't process the image.");
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

const extensionFor = (type: string) => (type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg");

/**
 * Compress and upload photos straight to Vercel Blob. The upload service (services/upload) verifies the
 * Clerk token and only allows paths inside `post-media/<userId>/`.
 */
export async function uploadPhotos(
  files: File[],
  userId: string,
  getToken: () => Promise<string | null>,
): Promise<UploadedPhoto[]> {
  if (!photoUploadsEnabled()) throw new Error("Photo upload isn't configured.");
  const token = await getToken();
  if (!token) throw new Error("You're signed out. Please sign in again.");
  const results: UploadedPhoto[] = [];
  for (const file of files) {
    const { blob, width, height } = await compressPhoto(file);
    const uploaded = await uploadPresigned(`post-media/${userId}/${crypto.randomUUID()}.${extensionFor(blob.type)}`, blob, {
      access: "public",
      handleUploadUrl: env.uploadApiUrl,
      headers: { Authorization: `Bearer ${token}` },
      contentType: blob.type,
    });
    results.push({ url: uploaded.url, width, height });
  }
  return results;
}
