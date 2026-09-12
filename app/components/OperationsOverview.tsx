import type { Language, Workspace } from "@/lib/domain";

export default function OperationsOverview({ workspace, language }: { workspace: Workspace; language: Language }) {
  const t = (en: string, sw: string) => language === "sw" ? sw : en;
  const has = (...roles: string[]) => workspace.roles.some(r => roles.includes(r));
  const items = [
    ...(has("admin", "verifier") ? [
      { label: t("Organizations awaiting review", "Mashirika yanayosubiri ukaguzi"), count: workspace.organizations.filter(o => o.status === "pending").length, target: "review" },
      { label: t("Campaigns awaiting review", "Miradi inayosubiri ukaguzi"), count: workspace.campaigns.filter(c => c.status === "pending").length, target: "review" },
      { label: t("Updates awaiting review", "Taarifa zinazosubiri ukaguzi"), count: workspace.updates.filter(u => u.status === "pending").length, target: "review" },
    ] : []),
    ...(has("admin", "finance", "verifier") ? [
      { label: t("Open release requests", "Maombi ya kutoa fedha yaliyo wazi"), count: workspace.disbursements.filter(d => ["requested", "checked", "approved"].includes(d.status)).length, target: "finance" },
    ] : []),
    ...(has("admin") ? [
      { label: t("Unresolved risk flags", "Tahadhari za hatari zisizotatuliwa"), count: workspace.flags.filter(f => !f.resolved_by).length, target: "finance" },
      { label: t("Open support cases", "Maombi ya usaidizi yaliyo wazi"), count: workspace.complaints.filter(c => c.status !== "resolved").length, target: "support" },
    ] : []),
  ];
  if (!items.length) return null;
  return <section aria-label={t("Operations overview", "Muhtasari wa shughuli")}><h2>{t("Needs your attention", "Inahitaji umakini wako")}</h2><p>{t("A summary of records available to your role. Open a queue to review evidence and take action.", "Muhtasari wa rekodi zinazopatikana kwa jukumu lako. Fungua orodha ili kukagua ushahidi na kuchukua hatua.")}</p><div className="mvp-grid">{items.map(item => <a className="mvp-light-card mvp-queue" key={item.label} href={`#${item.target}`}><strong>{item.count}</strong><span>{item.label}</span></a>)}</div></section>;
}
