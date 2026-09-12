import { identity, response, failure } from "@/lib/api";
import { serviceDatabase } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return response({setupRequired:true,error:'Account service setup is incomplete'},503);
  try {
    const { db, user, roles, mfaRequired } = await identity();
    if (mfaRequired)
      return response({
        user: { id: user.id, email: user.email },
        roles,
        mfaRequired,
      });
    const tables = {
      refunds: "refunds",
      documents: "verification_documents",
      profile: "profiles",
      organizations: "organizations",
      campaigns: "campaigns",
      donations: "donations",
      updates: "campaign_updates",
      policies: "policy_versions",
      notifications: "notifications",
      favorites: "favorites",
      disbursements: "disbursements",
      settlements: "settlements",
      audit: "audit_logs",
      ledger: "journal_lines",
      complaints: "complaints",
      flags: "fraud_flags",
    };
    const entries = await Promise.all(
      Object.entries(tables).map(async ([key, table]) => {
        let query = db.from(table).select("*").limit(500);
        if (key === "profile") query = query.eq("id", user.id);
        if (["donations", "notifications", "audit", "updates"].includes(key))
          query = query.order("created_at", { ascending: false });
        const { data, error } = await query;
        if (error) throw new Error("Workspace query failed");
        return [key, key === "profile" ? data?.[0] || null : data || []];
      }),
    );
    const summary = await serviceDatabase().rpc("donor_summary", {
      p_user: user.id,
    });
    if (summary.error) throw summary.error;
    return response({
      ...Object.fromEntries(entries),
      summary: summary.data,
      user: { id: user.id, email: user.email },
      roles,
      mfaRequired: false,
    });
  } catch (error) {
    return failure(error);
  }
}
