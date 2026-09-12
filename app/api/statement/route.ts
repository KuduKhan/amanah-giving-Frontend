import { ApiError, failure, identity } from "@/lib/api";
export async function GET() {
  try {
    const { db, user, mfaRequired } = await identity();
    if (mfaRequired)
      throw new ApiError("Complete two-factor verification", 403);
    const lines = ["Receipt,Date,Currency,Amount,Giving type,Campaign,Status"];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from("donations")
        .select("id,confirmed_at,amount,giving_type,campaign_id,status")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "refunded"])
        .order("created_at")
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      for (const d of data)
        lines.push(
          [
            d.id,
            d.confirmed_at,
            "KES",
            (Number(d.amount) / 100).toFixed(2),
            d.giving_type,
            d.campaign_id,
            d.status,
          ].join(","),
        );
      if (data.length < 1000) break;
    }
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="amanah-giving-statement.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
