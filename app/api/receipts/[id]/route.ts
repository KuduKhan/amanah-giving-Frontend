import { ApiError, failure, identity } from "@/lib/api";
import { serviceDatabase } from "@/lib/supabase/server";
import { validUuid, formatMoney } from "@/lib/domain";
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, mfaRequired } = await identity();
    if (mfaRequired)
      throw new ApiError("Complete two-factor verification", 403);
    const { id } = await params;
    if (!validUuid(id)) throw new ApiError("Invalid receipt", 404);
    const db = serviceDatabase();
    const { data: d, error } = await db
      .from("donations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .maybeSingle();
    if (error) throw error;
    if (!d) throw new ApiError("Confirmed receipt not found", 404);
    const { data: c } = await db
      .from("campaigns")
      .select("title")
      .eq("id", d.campaign_id)
      .single();
    const rows = [
      ["Receipt / Risiti", d.id],
      ["Amount / Kiasi", formatMoney(d.amount)],
      ["Giving type / Aina", d.giving_type],
      ["Campaign / Mradi", c?.title],
      ["Confirmed / Imethibitishwa", new Date(d.confirmed_at).toISOString()],
      [
        "Payment reference / Rejeleo",
        `••••${String(d.provider_reference).slice(-4)}`,
      ],
      [
        "Policy version / Toleo la sera",
        d.policy_id || "Not applicable / Haihusiki",
      ],
      ["Dedication / Ujumbe", d.dedication || "—"],
    ];
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Amanah Giving receipt</title><style>body{font:16px system-ui;color:#102638;max-width:720px;margin:40px auto;padding:24px}img{width:84px;height:84px}h1{font-family:Georgia,serif}dl>div{display:grid;grid-template-columns:1fr 2fr;gap:16px;padding:16px 0;border-bottom:1px solid #ddd}dd{margin:0;overflow-wrap:anywhere}aside{background:#f3eee4;padding:20px}@media print{.no-print{display:none}}</style><img src="/amanah-logo.png" alt="Amanah Giving"><h1>JazakAllahu Khayran</h1><p>Donation confirmed · Mchango umethibitishwa</p><dl>${rows.map(([a, b]) => `<div><dt>${escape(a)}</dt><dd>${escape(b)}</dd></div>`).join("")}</dl><aside>This confirms a donation recorded by Amanah Giving. It does not certify tax deductibility.<br>Hii ni risiti ya mchango uliorekodiwa. Haithibitishi msamaha wa kodi.</aside><p class="no-print">Use your browser’s Print → Save as PDF to download. / Tumia Chapisha → Hifadhi PDF.</p><a class="no-print" href="/workspace">My Giving / Sadaka zangu</a></html>`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy":
          "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
