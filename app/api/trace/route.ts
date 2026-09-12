import { ApiError, failure, response } from "@/lib/api";
import { publicDatabase, serviceDatabase } from "@/lib/supabase/server";
import { validUuid } from "@/lib/domain";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("campaign");
    if (!validUuid(id)) throw new ApiError("Campaign not found", 404);
    const visible = await publicDatabase()
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (visible.error) throw visible.error;
    if (!visible.data) throw new ApiError("Campaign not found", 404);
    // Explicit public projection: never expose recipient, bank or staff identifiers.
    const { data, error } = await serviceDatabase()
      .from("disbursements")
      .select("id,amount,giving_type,purpose,created_at:paid_at")
      .eq("campaign_id", id)
      .eq("status", "paid")
      .order("created_at");
    if (error) throw error;
    return response({ releases: data });
  } catch (error) {
    return failure(error);
  }
}
