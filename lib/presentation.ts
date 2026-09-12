import type { Campaign, Language } from "./domain";

/** Presentation only: the server remains authoritative for accepting donations. */
export function campaignAvailability(c: Pick<Campaign, "goal" | "raised" | "end_date" | "status">, now = Date.now()) {
  if (c.raised >= c.goal) return "funded";
  if (c.status !== "published" || Date.parse(`${c.end_date}T23:59:59Z`) < now) return "closed";
  return "open";
}

export function statusLabel(status: string, language: Language) {
  const labels: Record<string, [string, string]> = {
    confirmed: ["Confirmed", "Imethibitishwa"],
    pending: ["Awaiting confirmation", "Inasubiri uthibitisho"],
    failed: ["Payment unsuccessful", "Malipo hayakufaulu"],
    cancelled: ["Payment cancelled", "Malipo yameghairiwa"],
    refunded: ["Refunded", "Imerejeshwa"],
  };
  return labels[status]?.[language === "sw" ? 1 : 0] ?? (language === "sw" ? "Inahitaji ukaguzi" : "Needs review");
}

export function workflowLabel(status: string, language: Language) {
  const labels: Record<string, [string, string]> = {
    pending: ["Awaiting review", "Inasubiri ukaguzi"], verified: ["Verified", "Imethibitishwa"],
    published: ["Published", "Imechapishwa"], rejected: ["Rejected", "Imekataliwa"],
    suspended: ["Suspended", "Imesitishwa"], closed: ["Closed", "Imefungwa"],
    requested: ["Requested", "Imeombwa"], checked: ["Checked", "Imekaguliwa"],
    approved: ["Approved", "Imeidhinishwa"], paid: ["Transfer recorded", "Malipo yamerekodiwa"],
    open: ["Open", "Wazi"], resolved: ["Resolved", "Imetatuliwa"], refunded: ["Refunded", "Imerejeshwa"],
  };
  return labels[status]?.[language === "sw" ? 1 : 0] ?? status.replaceAll("_", " ");
}
