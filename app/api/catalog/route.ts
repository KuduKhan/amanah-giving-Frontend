import { configured, publicDatabase } from "@/lib/supabase/server";
import { response, failure } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!configured())
    return response({
      configured: false,
      campaigns: [],
      organizations: [],
      updates: [],
      policies: [],
      payments: { mpesa: false, stripe: false },
    });
  try {
    const db = publicDatabase();
    const results = await Promise.all([
      db
        .from("campaigns")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("organizations")
        .select("id,name,location,description,verification_summary,status")
        .eq("status", "verified")
        .limit(100),
      db
        .from("campaign_updates")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("policy_versions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (results.some((r) => r.error)) throw new Error("Catalog unavailable");
    return response({
      configured: true,
      campaigns: results[0].data,
      organizations: results[1].data,
      updates: results[2].data,
      policies: results[3].data,
      payments: {
        mpesa: Boolean(
          process.env.PAYMENTS_ENABLED === "true" &&
            process.env.MPESA_CONSUMER_KEY &&
            process.env.MPESA_CALLBACK_SECRET,
        ),
        stripe: Boolean(
          process.env.PAYMENTS_ENABLED === "true" &&
            process.env.STRIPE_SECRET_KEY &&
            process.env.STRIPE_WEBHOOK_SECRET,
        ),
      },
    });
  } catch (error) {
    return failure(error);
  }
}
