import {
  ApiError,
  failure,
  identity,
  limit,
  requireOrigin,
  response,
} from "@/lib/api";
import { reconcilePending } from "@/lib/payments";
import { sameSecret } from "@/lib/payment-validation";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { user, roles, mfaRequired } = await identity();
    if (mfaRequired || !roles.includes("finance"))
      throw new ApiError(
        "Finance access with two-factor verification required",
        403,
      );
    await limit(user.id, "reconcile", 3);
    return response(await reconcilePending());
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: Request) {
  if (
    !sameSecret(
      request.headers.get("authorization") || "",
      process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "",
    )
  )
    return response({ error: "Unauthorized" }, 401);
  try {
    return response(await reconcilePending());
  } catch (error) {
    return failure(error);
  }
}
