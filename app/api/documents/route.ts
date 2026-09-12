import { randomUUID } from "node:crypto";
import {
  ApiError,
  failure,
  identity,
  limit,
  requireOrigin,
  response,
} from "@/lib/api";
import { serviceDatabase } from "@/lib/supabase/server";
import {
  encryptDocument,
  decryptDocument,
  documentType,
  scanDocument,
} from "@/lib/documents";
import { validUuid } from "@/lib/domain";
import { boundedBody } from '@/lib/body';
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { user, mfaRequired } = await identity();
    if (mfaRequired)
      throw new ApiError("Complete two-factor verification", 403);
    await limit(user.id, "upload", 8);
    if (Number(request.headers.get("content-length") || 0) > 2200000)
      throw new ApiError("Document must be smaller than 2 MB", 413);
    let bytesBody: Uint8Array;
    try { bytesBody=await boundedBody(request,2200000); } catch { throw new ApiError('Document must be smaller than 2 MB',413); }
    const form = await new Response(new Uint8Array(bytesBody), {headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
    const file = form.get("file");
    const org = form.get("organization_id");
    if (
      !(file instanceof File) ||
      file.size > 2000000 ||
      file.size < 8 ||
      !validUuid(org)
    )
      throw new ApiError(
        "Select an organization and a PDF, PNG or JPEG under 2 MB",
      );
    const db = serviceDatabase();
    const { data: o } = await db
      .from("organizations")
      .select("id")
      .eq("id", org)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!o) throw new ApiError("Organization not found", 404);
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = documentType(bytes);
    const encrypted = encryptDocument(bytes);
    await scanDocument(bytes);
    const id = randomUUID();
    const path = `${org}/${id}.bin`;
    const uploaded = await db.storage
      .from("amanah-evidence")
      .upload(path, encrypted, {
        contentType: "application/octet-stream",
        upsert: false,
      });
    if (uploaded.error) throw uploaded.error;
    const saved = await db
      .from("verification_documents")
      .insert({
        id,
        organization_id: org,
        owner_id: user.id,
        storage_path: path,
        mime,
        size: file.size,
      });
    if (saved.error) {
      await db.storage.from("amanah-evidence").remove([path]);
      throw saved.error;
    }
    const audit = await db
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        action: "document.uploaded",
        entity_id: id,
      });
    if (audit.error) throw audit.error;
    return response({ ok: true, id });
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: Request) {
  try {
    const { db, user, mfaRequired } = await identity();
    if (mfaRequired)
      throw new ApiError("Complete two-factor verification", 403);
    const id = new URL(request.url).searchParams.get("id");
    if (!validUuid(id)) throw new ApiError("Document not found", 404);
    const { data: doc, error } = await db
      .from("verification_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!doc) throw new ApiError("Document not found", 404);
    const service = serviceDatabase();
    const audit = await service
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        action: "document.downloaded",
        entity_id: id,
      });
    if (audit.error) throw audit.error;
    const { data: file, error: downloadError } = await service.storage
      .from("amanah-evidence")
      .download(doc.storage_path);
    if (downloadError || !file) throw downloadError;
    const bytes = decryptDocument(Buffer.from(await file.arrayBuffer()));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": `attachment; filename="verification-${id}.${doc.mime === "application/pdf" ? "pdf" : doc.mime === "image/png" ? "png" : "jpg"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
