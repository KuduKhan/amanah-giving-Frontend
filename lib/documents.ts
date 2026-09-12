import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ApiError } from "./api";
function key() {
  const value = process.env.DOCUMENT_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new ApiError("Private document storage is not yet available", 503);
  return Buffer.from(value, "hex");
}
export function encryptDocument(bytes: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}
export function decryptDocument(bytes: Buffer) {
  const cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]);
}
export function documentType(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  throw new ApiError("Use a PDF, PNG or JPEG document");
}
export async function scanDocument(bytes: Buffer) {
  const endpoint = process.env.DOCUMENT_SCAN_URL;
  const token = process.env.DOCUMENT_SCAN_TOKEN;
  if (!endpoint || !token || new URL(endpoint).protocol !== "https:")
    throw new ApiError(
      "Document screening is not yet available. Please return later.",
      503,
    );
  const result = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const data = (await result.json()) as { clean?: boolean };
  if (!result.ok || data.clean !== true)
    throw new ApiError("This document could not pass security screening");
}
