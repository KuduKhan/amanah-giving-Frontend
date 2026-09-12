import "server-only";
import { sessionDatabase, serviceDatabase } from "./supabase/server";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return response({ error: error.message }, error.status);
  console.error(
    "Amanah request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return response(
    { error: "The service is unavailable. Please try again later." },
    503,
  );
}
export function requireOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected =
    process.env.APP_URL ||
    (process.env.NODE_ENV === "development" ? new URL(request.url).origin : "");
  if (!expected || origin !== new URL(expected).origin)
    throw new ApiError("Request origin rejected", 403);
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError("JSON required");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Request body required");
  let raw = "";
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 24000) {
      await reader.cancel();
      throw new ApiError("Request too large", 413);
    }
    raw += decoder.decode(value, { stream: true });
  }
  try {
    const data = JSON.parse(raw + decoder.decode());
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new ApiError("Invalid JSON");
  }
}
export async function identity() {
  const db = await sessionDatabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new ApiError("Sign in to continue", 401);
  if (!user.email_confirmed_at)
    throw new ApiError("Verify your email to continue", 403);
  const claims = await db.auth.getClaims();
  const sessionId = claims.data?.claims.session_id;
  if (claims.error || typeof sessionId !== "string")
    throw new ApiError("Sign in again to continue", 401);
  const active = await serviceDatabase().rpc("active_session", {
    p_user: user.id,
    p_session: sessionId,
  });
  if (active.error) throw new Error("Session validation unavailable");
  if (!active.data) throw new ApiError("Session expired. Sign in again.", 401);
  const rolesResult = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (rolesResult.error) throw new Error("Roles unavailable");
  const roles = (rolesResult.data || []).map((r) => r.role as string);
  const assurance = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw new Error("Session assurance unavailable");
  const mfaRequired =
    (roles.length > 0 || assurance.data.nextLevel === "aal2") &&
    assurance.data.currentLevel !== "aal2";
  return { db, user, roles, mfaRequired };
}
export async function limit(user: string, action: string, maximum = 20) {
  const { data, error } = await serviceDatabase().rpc("take_rate_limit", {
    p_key: `${action}:${user}`,
    p_limit: maximum,
    p_seconds: 600,
  });
  if (error) throw new Error("Rate limiter unavailable");
  if (!data)
    throw new ApiError("Too many requests. Try again in ten minutes.", 429);
}
export function databaseError(message: string) {
  const known = [
    "Your confirmed donation is required",
    "Funds already allocated. Contact support for review",
    "External refund statement reference required",
    "Screened verification evidence required",
    "Permission denied",
    "Verify your email first",
    "Verified account required",
    "Campaign is not accepting gifts",
    "This campaign is not Zakat eligible",
    "Idempotency key reused with different details",
    "Dedication too long",
    "Verified organization ownership required",
    "Budget must match the fundraising goal",
    "Record the evidence checked and a meaningful decision",
    "Independent reviewer required",
    "Independent reviewer and verified organization required",
    "Select an approved policy",
    "Organization ownership required",
    "Confirmed payment required",
    "Bank statement reference required",
    "Resolve risk flags before release",
    "Insufficient settled, unreserved funds",
    "Independent operator required",
    "Suspended campaign or organization",
    "External transfer reference required",
    "Invalid approval transition",
    "Resolution detail required",
  ];
  throw new ApiError(
    known.includes(message)
      ? message
      : "This action could not be saved. Check for duplicate records and complete all required fields.",
  );
}
