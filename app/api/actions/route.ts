import {
  ApiError,
  databaseError,
  failure,
  identity,
  jsonBody,
  limit,
  requireOrigin,
  response,
} from "@/lib/api";
import { serviceDatabase } from "@/lib/supabase/server";
const fields: Record<string, string[]> = {
  refund_request: ["donation_id", "reason"],
  refund_review: ["id", "step"],
  profile: ["name", "language"],
  favorite: ["campaign_id"],
  read_notifications: [],
  organization: ["name", "registration", "location", "description"],
  campaign: [
    "organization_id",
    "title",
    "title_sw",
    "story",
    "story_sw",
    "category",
    "location",
    "end_date",
  ],
  policy: ["title", "content"],
  review: ["id", "entity", "decision", "notes"],
  update: ["campaign_id", "title", "title_sw", "body", "body_sw"],
  settle: ["donation_id", "bank_reference"],
  disbursement: [
    "campaign_id",
    "giving_type",
    "purpose",
    "recipient_reference",
  ],
  release: ["id", "step"],
  complaint: ["body"],
  resolve_complaint: ["id", "notes"],
  resolve_flag: ["id", "notes"],
};
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { user, mfaRequired } = await identity();
    if (mfaRequired)
      throw new ApiError("Complete two-factor verification", 403);
    await limit(user.id, "actions", 50);
    const body = await jsonBody(request);
    const action = String(body.action);
    const data = body.data as Record<string, unknown>;
    if (
      !fields[action] ||
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    )
      throw new ApiError("Invalid action");
    for (const field of fields[action])
      if (
        typeof data[field] !== "string" ||
        !String(data[field]).trim() ||
        String(data[field]).length > 6000
      )
        throw new ApiError(`Complete the ${field.replaceAll("_", " ")} field`);
    if (
      action === "campaign" &&
      (!Array.isArray(data.budget) ||
        data.budget.length < 1 ||
        data.budget.length > 30 ||
        !Number.isSafeInteger(data.goal) ||
        new Date(String(data.end_date)).getTime() <= Date.now())
    )
      throw new ApiError("Enter a future closing date and a complete budget");
    if (
      action === "disbursement" &&
      (!Number.isSafeInteger(data.amount) || Number(data.amount) <= 0)
    )
      throw new ApiError("Enter a valid amount");
    const result = await serviceDatabase().rpc("mutate_mvp", {
      p_actor: user.id,
      p_action: action,
      p_data: data,
    });
    if (result.error) databaseError(result.error.message);
    return response(result.data);
  } catch (error) {
    return failure(error);
  }
}
