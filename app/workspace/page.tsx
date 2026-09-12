"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/use-language";
import AmanahLogo from "../AmanahLogo";
import Icon from "../Icon";
import Documents from "../components/Documents";
import AccountAccess from "../components/AccountAccess";
import OperationsOverview from "../components/OperationsOverview";
import { browserDatabase } from "@/lib/supabase/browser";
import { Language, Workspace, formatMoney } from "@/lib/domain";
import { workflowLabel } from "@/lib/presentation";

type Field = {
  name: string;
  en: string;
  sw: string;
  type?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
  value?: string;
};
function ActionForm({
  title,
  fields,
  onSave,
  language,
  submit = "Save",
}: {
  title: string;
  fields: Field[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  language: Language;
  submit?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      className="mvp-form mvp-light-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setError("");
        setDone(false);
        try {
          const data: Record<string, unknown> = {};
          for (const [key, value] of new FormData(form)) data[key] = value;
          if (data.amount) data.amount = Math.round(Number(data.amount) * 100);
          await onSave(data);
          setDone(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{title}</h3>
      {fields.map((f) => (
        <label key={f.name}>
          {language === "sw" ? f.sw : f.en}
          {f.options ? (
            <select
              required={!f.optional}
              name={f.name}
              defaultValue={f.value || ""}
            >
              <option value="">
                {language === "sw" ? "Chagua…" : "Choose…"}
              </option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              name={f.name}
              required={!f.optional}
              minLength={f.name === "notes" ? 20 : 1}
              maxLength={6000}
              defaultValue={f.value}
              rows={4}
            />
          ) : (
            <input
              name={f.name}
              type={f.type || "text"}
              required={!f.optional}
              maxLength={6000}
              min={f.type === "number" ? 1 : undefined}
              step={f.type === "number" ? 1 : undefined}
              defaultValue={f.value}
            />
          )}
        </label>
      ))}
      {error && (
        <p role="alert" className="mvp-error">
          {error}
        </p>
      )}
      {done && (
        <p role="status">
          {language === "sw" ? "Imehifadhiwa." : "Saved successfully."}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy
          ? language === "sw"
            ? "Inahifadhi…"
            : "Saving…"
          : language === "sw"
            ? "Hifadhi"
            : submit}{" "}
        <Icon name="→" />
      </button>
    </form>
  );
}
function CampaignForm({
  workspace,
  language,
  save,
}: {
  workspace: Workspace;
  language: Language;
  save: (a: string, d: Record<string, unknown>) => Promise<void>;
}) {
  const [budget, setBudget] = useState([{ label: "", amount: "" }]);
  const t = (en: string, sw: string) => (language === "sw" ? sw : en);
  return (
    <div className="mvp-light-card">
      <h3>{t("Build a transparent budget", "Andaa bajeti yenye uwazi")}</h3>
      {budget.map((b, i) => (
        <div className="mvp-budget-row" key={i}>
          <label>
            {t("Budget item", "Kipengele")}
            <input
              maxLength={120}
              value={b.label}
              onChange={(e) =>
                setBudget(
                  budget.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            {t("Amount (KSh)", "Kiasi (KSh)")}
            <input
              type="number"
              min={1}
              step={1}
              value={b.amount}
              onChange={(e) =>
                setBudget(
                  budget.map((x, j) =>
                    j === i ? { ...x, amount: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            aria-label={t("Remove budget item", "Ondoa kipengele")}
            disabled={budget.length === 1}
            onClick={() => setBudget(budget.filter((_, j) => i !== j))}
          >
            <Icon name="×" />
          </button>
        </div>
      ))}
      <button
        className="text-link"
        disabled={budget.length >= 30}
        onClick={() => setBudget([...budget, { label: "", amount: "" }])}
      >
        {t("Add budget item", "Ongeza kipengele")} +
      </button>
      <ActionForm
        title={t("Submit a campaign for review", "Wasilisha mradi kwa ukaguzi")}
        language={language}
        fields={[
          {
            name: "organization_id",
            en: "Organization",
            sw: "Shirika",
            options: workspace.organizations
              .filter(
                (o) =>
                  o.owner_id === workspace.user.id && o.status === "verified",
              )
              .map((o) => ({ value: o.id, label: o.name })),
          },
          { name: "title", en: "Title · English", sw: "Kichwa · Kiingereza" },
          {
            name: "title_sw",
            en: "Title · Kiswahili",
            sw: "Kichwa · Kiswahili",
          },
          {
            name: "story",
            en: "Need and delivery plan · English",
            sw: "Mahitaji na mpango · Kiingereza",
            type: "textarea",
          },
          {
            name: "story_sw",
            en: "Need and delivery plan · Kiswahili",
            sw: "Mahitaji na mpango · Kiswahili",
            type: "textarea",
          },
          { name: "location", en: "County / location", sw: "Kaunti / eneo" },
          {
            name: "category",
            en: "Category",
            sw: "Aina",
            options: [
              "Food",
              "Water",
              "Orphans",
              "Mosque",
              "Education",
              "Emergency",
              "Health",
            ].map((x) => ({ value: x, label: x })),
          },
          {
            name: "end_date",
            en: "Closing date",
            sw: "Tarehe ya mwisho",
            type: "date",
          },
        ]}
        onSave={async (data) => {
          const items = budget.map((b) => ({
            label: b.label,
            amount: Number(b.amount) * 100,
          }));
          if (
            items.some(
              (b) =>
                b.label.trim().length < 2 ||
                !Number.isSafeInteger(b.amount) ||
                b.amount <= 0,
            )
          )
            throw new Error(
              t(
                "Complete every budget item.",
                "Jaza kila kipengele cha bajeti.",
              ),
            );
          await save("campaign", {
            ...data,
            budget: items,
            goal: items.reduce((n, b) => n + b.amount, 0),
          });
        }}
      />
    </div>
  );
}

export default function WorkspacePage() {
  const [language, setLanguage] = useLanguage();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [state, setState] = useState(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "loading"
      : "setup",
  );
  const [error, setError] = useState("");
  const [tab, setTab] = useState("giving");
  const [givingType, setGivingType] = useState("");
  const [givingStatus, setGivingStatus] = useState("");
  const [givingQuery, setGivingQuery] = useState("");
  useEffect(() => {
    const sync = () => { const section = window.location.hash.slice(1); if (["giving", "organization", "review", "finance", "notifications", "profile", "support", "audit"].includes(section)) setTab(section); };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const t = (en: string, sw: string) => (language === "sw" ? sw : en);
  async function load() {
    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ) {
        setState("setup");
        return;
      }
      const r = await fetch("/api/workspace", { cache: "no-store" });
      const d = (await r.json()) as Workspace & { error?: string; setupRequired?: boolean };
      if (r.status === 401) {
        setState("signin");
        return;
      }
      if(d.setupRequired){setState("setup");return;}
      if (!r.ok) throw new Error(d.error);
      setWorkspace(d);
      setState(d.mfaRequired ? "mfa" : "ready");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load");
      setState("error");
    }
  }
  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
      return;
    const controller = new AbortController();
    fetch("/api/workspace", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401) {
          setState("signin");
          return;
        }
        const d = (await r.json()) as Workspace & { error?: string; setupRequired?: boolean };
        if(d.setupRequired){setState("setup");return;}
        if (!r.ok) throw new Error(d.error);
        setWorkspace(d);
        setState(d.mfaRequired ? "mfa" : "ready");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setState("error");
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  async function save(action: string, data: Record<string, unknown>) {
    const r = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const d = (await r.json()) as { error?: string };
    if (!r.ok) throw new Error(d.error);
    await load();
  }
  const has = (...roles: string[]) =>
    workspace?.roles.some((r) => roles.includes(r));
  const ownCampaigns =
    workspace?.campaigns.filter((c) =>
      workspace.organizations.some(
        (o) => o.id === c.organization_id && o.owner_id === workspace.user.id,
      ),
    ) || [];
  const ownDonations =
    workspace?.donations.filter((d) => d.user_id === workspace.user.id) || [];
  const filteredDonations = ownDonations.filter(d => (!givingType || d.giving_type === givingType) && (!givingStatus || d.status === givingStatus) && `${workspace?.campaigns.find(c => c.id === d.campaign_id)?.title || ""} ${workspace?.campaigns.find(c => c.id === d.campaign_id)?.title_sw || ""} ${d.id}`.toLowerCase().includes(givingQuery.toLowerCase().trim()));
  const campaignOptions = (workspace?.campaigns || []).map((c) => ({
    value: c.id,
    label: language === "sw" ? c.title_sw : c.title,
  }));
  const note: Field = {
    name: "notes",
    en: "Evidence checked and decision (at least 20 characters; no private identities)",
    sw: "Ushahidi na uamuzi (angalau herufi 20; bila majina binafsi)",
    type: "textarea",
  };
  const review = (entity: string, id: string, title: string) => (
    <ActionForm
      key={`${entity}:${id}`}
      title={title}
      language={language}
      fields={[
        {
          name: "decision",
          en: "Decision",
          sw: "Uamuzi",
          options: [
            { value: "approve", label: t("Approve", "Idhinisha") },
            { value: "reject", label: t("Reject", "Kataa") },
            { value: "suspend", label: t("Suspend", "Sitisha") },
          ],
        },
        note,
        ...(entity === "zakat"
          ? [
              {
                name: "policy_id",
                en: "Policy",
                sw: "Sera",
                options: workspace?.policies.map((p) => ({
                  value: p.id,
                  label: p.title,
                })),
              },
            ]
          : []),
      ]}
      onSave={(data) => save("review", { ...data, entity, id })}
    />
  );
  return (
    <main className="mvp-workspace">
      <header className="mvp-workspace-header">
        <Link href="/" aria-label="Amanah Giving">
          <AmanahLogo />
        </Link>
        <div className="mvp-actions">
          <button
            className="text-link"
            onClick={() => setLanguage(language === "en" ? "sw" : "en")}
          >
            {language === "en" ? "Kiswahili" : "English"}
          </button>
          <Link className="text-link" href="/">
            {t("Explore causes", "Angalia miradi")} <Icon name="↗" />
          </Link>
          {state === "ready" && (
            <button
              className="text-link"
              onClick={async () => {
                await browserDatabase().auth.signOut();
                setWorkspace(null);
                setState("signin");
              }}
            >
              {t("Sign out", "Ondoka")}
            </button>
          )}
        </div>
      </header>
      <div className="mvp-workspace-body">
        <p className="eyebrow">
          {t("Your private giving space", "Sehemu yako binafsi ya sadaka")}
        </p>
        <h1>{t("My Giving", "Sadaka zangu")}</h1>
        {state === "loading" && (
          <p role="status">
            {t("Loading your account…", "Inapakia akaunti yako…")}
          </p>
        )}
        {state === "setup" && (
          <div className="mvp-light-card">
            <h2>
              {t(
                "We’re preparing to welcome you.",
                "Tunajiandaa kukukaribisha.",
              )}
            </h2>
            <p>
              {t(
                "Accounts and donations will open once the secure service is connected. Please return soon.",
                "Akaunti na michango zitafunguliwa huduma salama itakapounganishwa. Tafadhali rudi hivi karibuni.",
              )}
            </p>
            <Link className="button" href="/">
              {t("Back to Amanah", "Rudi Amanah")}
            </Link>
          </div>
        )}
        {(state === "signin" || state === "mfa") && (
          <div className="mvp-light-card">
            <AccountAccess
              key={state}
              language={language}
              mfaOnly={state === "mfa"}
              onReady={load}
            />
          </div>
        )}
        {error && (
          <div className="mvp-notice" role="alert">
            <p>{error}</p>
            <button className="button" onClick={load}>
              {t("Retry", "Jaribu tena")}
            </button>
          </div>
        )}
        {state === "ready" && workspace && (
          <>
            <p>
              {t("Assalamu Alaikum", "Assalamu Alaikum")},{" "}
              {workspace.profile?.display_name || workspace.user.email}
            </p>
            <nav
              className="mvp-tabs"
              aria-label={t("Account sections", "Sehemu za akaunti")}
            >
              {[
                ["giving", t("Donations", "Michango")],
                ["organization", t("Organization", "Shirika")],
                ...(has("admin", "verifier", "shariah")
                  ? [["review", t("Reviews", "Ukaguzi")]]
                  : []),
                ...(has("finance", "auditor", "admin", "verifier")
                  ? [["finance", t("Finance", "Fedha")]]
                  : []),
                ["notifications", t("Notifications", "Arifa")],
                ["profile", t("Preferences", "Mapendeleo")],
                ["support", t("Support", "Usaidizi")],
                ...(has("admin", "auditor")
                  ? [["audit", t("Audit trail", "Rekodi za ukaguzi")]]
                  : []),
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={tab === id ? "active" : ""}
                  aria-current={tab === id ? "page" : undefined}
                  onClick={() => { setTab(id); window.history.replaceState(null, "", `#${id}`); }}
                >
                  {label}{id === "notifications" && workspace.notifications.some(n => !n.read_at) ? ` (${workspace.notifications.filter(n => !n.read_at).length})` : ""}
                </button>
              ))}
            </nav>
            {tab === "giving" && (
              <div className="mvp-stack">
                <OperationsOverview workspace={workspace} language={language} />
                <div className="mvp-grid">
                  {[
                    [
                      t("Total confirmed", "Jumla iliyothibitishwa"),
                      formatMoney(workspace.summary.total, language),
                    ],
                    [
                      t("Projects supported", "Miradi iliyosaidiwa"),
                      workspace.summary.projects,
                    ],
                    [
                      t("Confirmed gifts", "Michango iliyothibitishwa"),
                      workspace.summary.gifts,
                    ],
                  ].map(([label, value]) => (
                    <article key={label} className="mvp-light-card">
                      <p>{label}</p>
                      <h3>{value}</h3>
                    </article>
                  ))}
                </div>
                <div className="mvp-light-card">
                  <h2>
                    {t("Your donation history", "Historia ya michango yako")}
                  </h2>
                  <p>
                    {t(
                      "Showing your most recent records. Pending payments do not count as confirmed donations.",
                      "Rekodi zako za hivi karibuni. Malipo yanayosubiri hayahesabiwi kama michango iliyothibitishwa.",
                    )}
                  </p>
                  <a className="text-link" href="/api/statement">
                    {t(
                      "Download full statement (CSV)",
                      "Pakua taarifa kamili (CSV)",
                    )}{" "}
                    <Icon name="download" />
                  </a>
                  <div className="mvp-filters">
                    <label>{t("Search your records", "Tafuta rekodi zako")}<input value={givingQuery} onChange={e => setGivingQuery(e.target.value)} placeholder={t("Campaign or reference", "Mradi au rejeleo")} /></label>
                    <label>{t("Giving type", "Aina ya mchango")}<select value={givingType} onChange={e => setGivingType(e.target.value)}><option value="">{t("All types", "Aina zote")}</option><option value="SADAQAH">Sadaqah</option><option value="ZAKAT">{t("Zakat", "Zaka")}</option></select></label>
                    <label>{t("Payment status", "Hali ya malipo")}<select value={givingStatus} onChange={e => setGivingStatus(e.target.value)}><option value="">{t("All statuses", "Hali zote")}</option><option value="confirmed">{t("Confirmed", "Imethibitishwa")}</option><option value="pending">{t("Pending", "Inasubiri")}</option><option value="failed">{t("Failed", "Imeshindikana")}</option><option value="refunded">{t("Refunded", "Imerejeshwa")}</option></select></label>
                  </div>
                  <p role="status">{filteredDonations.length} {t("matching records in loaded history", "rekodi zinazolingana katika historia iliyopakiwa")}</p>
                  {(givingType || givingStatus || givingQuery) && <button className="text-link" onClick={() => { setGivingType(""); setGivingStatus(""); setGivingQuery(""); }}>{t("Clear filters", "Ondoa vichujio")}</button>}
                </div>
                {!ownDonations.length && (
                  <p className="mvp-notice">
                    {t(
                      "Your first gift will appear here.",
                      "Mchango wako wa kwanza utaonekana hapa.",
                    )}
                  </p>
                )}
                {filteredDonations.map((d) => (
                  <article key={d.id} className="mvp-light-card">
                    <div className="mvp-row">
                      <h3>
                        {formatMoney(d.amount, language)} · {d.giving_type}
                      </h3>
                      <span className="mvp-status">
                        {d.status === "confirmed"
                          ? t("Confirmed", "Imethibitishwa")
                          : d.status === "refunded"
                            ? t("Refunded", "Imerejeshwa")
                            : d.status === "failed"
                              ? t("Failed", "Imeshindikana")
                              : t(
                                  "Awaiting confirmation",
                                  "Inasubiri uthibitisho",
                                )}
                      </span>
                    </div>
                    <p>
                      {(language === "sw" ? workspace.campaigns.find((c) => c.id === d.campaign_id)?.title_sw : workspace.campaigns.find((c) => c.id === d.campaign_id)?.title) || t("Campaign record", "Rekodi ya mradi")}
                    </p>
                    <p>
                      {new Date(d.created_at).toLocaleString(
                        language === "sw" ? "sw-KE" : "en-KE",
                      )}
                    </p>
                    <small className="mvp-reference">{d.id}</small>
                    {d.status === "confirmed" ? (
                      <a
                        className="text-link"
                        target="_blank"
                        rel="noopener"
                        href={`/api/receipts/${d.id}`}
                      >
                        {t("View / print receipt", "Ona / chapisha risiti")}{" "}
                        <Icon name="↗" />
                      </a>
                    ) : (
                      <button className="text-link" onClick={load}>
                        {t("Refresh payment status", "Sasisha hali ya malipo")}
                      </button>
                    )}
                  </article>
                ))}
                <h3>{t("Saved causes", "Miradi iliyohifadhiwa")}</h3>
                {workspace.campaigns
                  .filter((c) => c.status === "published")
                  .map((c) => (
                    <div className="mvp-row mvp-light-card" key={c.id}>
                      <span>{language === "sw" ? c.title_sw : c.title}</span>
                      <button
                        className="text-link"
                        onClick={() =>
                          save("favorite", {
                            campaign_id: c.id,
                            saved: !workspace.favorites.some(
                              (f) => f.campaign_id === c.id,
                            ),
                          }).catch((e) => setError(e.message))
                        }
                      >
                        {workspace.favorites.some((f) => f.campaign_id === c.id)
                          ? t("Remove saved", "Ondoa iliyohifadhiwa")
                          : t("Save cause", "Hifadhi mradi")}
                      </button>
                    </div>
                  ))}
              </div>
            )}
            {tab === "organization" && (
              <div className="mvp-stack">
                <Documents
                  workspace={workspace}
                  language={language}
                  onSaved={load}
                />
                <ActionForm
                  title={t("Register an organization", "Sajili shirika")}
                  language={language}
                  fields={[
                    {
                      name: "name",
                      en: "Registered name",
                      sw: "Jina lililosajiliwa",
                    },
                    {
                      name: "registration",
                      en: "Registration number",
                      sw: "Nambari ya usajili",
                    },
                    { name: "location", en: "Location", sw: "Eneo" },
                    {
                      name: "description",
                      en: "Mission and official contact details",
                      sw: "Dhamira na mawasiliano rasmi",
                      type: "textarea",
                    },
                  ]}
                  onSave={(d) => save("organization", d)}
                />
                {workspace.organizations
                  .filter((o) => o.owner_id === workspace.user.id)
                  .map((o) => (
                    <article className="mvp-light-card" key={o.id}>
                      <h3>{o.name}</h3>
                      <p>{workflowLabel(o.status, language)}</p>
                      <p>
                        {o.verification_summary ||
                          t(
                            "Awaiting independent review.",
                            "Inasubiri ukaguzi huru.",
                          )}
                      </p>
                    </article>
                  ))}
                {workspace.organizations.some(
                  (o) =>
                    o.owner_id === workspace.user.id && o.status === "verified",
                ) && (
                  <CampaignForm
                    workspace={workspace}
                    language={language}
                    save={save}
                  />
                )}
                {ownCampaigns.map((c) => (
                  <article className="mvp-light-card" key={c.id}>
                    <h3>{c.title}</h3>
                    <p>
                      {workflowLabel(c.status, language)} · {formatMoney(c.raised, language)} /{" "}
                      {formatMoney(c.goal, language)}
                    </p>
                    <p>{c.verification_summary}</p>
                  </article>
                ))}
                {!!ownCampaigns.length && (
                  <>
                    <ActionForm
                      title={t(
                        "Submit a project update",
                        "Wasilisha taarifa ya mradi",
                      )}
                      language={language}
                      fields={[
                        {
                          name: "campaign_id",
                          en: "Campaign",
                          sw: "Mradi",
                          options: ownCampaigns.map((c) => ({
                            value: c.id,
                            label: c.title,
                          })),
                        },
                        {
                          name: "title",
                          en: "Title · English",
                          sw: "Kichwa · Kiingereza",
                        },
                        {
                          name: "title_sw",
                          en: "Title · Kiswahili",
                          sw: "Kichwa · Kiswahili",
                        },
                        {
                          name: "body",
                          en: "Evidence and progress · English",
                          sw: "Ushahidi na maendeleo · Kiingereza",
                          type: "textarea",
                        },
                        {
                          name: "body_sw",
                          en: "Evidence and progress · Kiswahili",
                          sw: "Ushahidi na maendeleo · Kiswahili",
                          type: "textarea",
                        },
                      ]}
                      onSave={(d) => save("update", d)}
                    />
                    <ActionForm
                      title={t(
                        "Request a fund release",
                        "Omba kutolewa kwa fedha",
                      )}
                      language={language}
                      fields={[
                        {
                          name: "campaign_id",
                          en: "Campaign",
                          sw: "Mradi",
                          options: ownCampaigns.map((c) => ({
                            value: c.id,
                            label: c.title,
                          })),
                        },
                        {
                          name: "giving_type",
                          en: "Restricted fund",
                          sw: "Mfuko uliotengwa",
                          options: [
                            { value: "SADAQAH", label: "Sadaqah" },
                            { value: "ZAKAT", label: "Zakat" },
                          ],
                        },
                        {
                          name: "amount",
                          en: "Amount (KSh)",
                          sw: "Kiasi (KSh)",
                          type: "number",
                        },
                        {
                          name: "purpose",
                          en: "Milestone and purpose",
                          sw: "Hatua na kusudi",
                          type: "textarea",
                        },
                        {
                          name: "recipient_reference",
                          en: "Verified recipient reference (not a bank account number)",
                          sw: "Rejeleo la mpokeaji aliyethibitishwa (si nambari ya akaunti)",
                        },
                      ]}
                      onSave={(d) => save("disbursement", d)}
                    />
                  </>
                )}
                {workspace.disbursements
                  .filter((d) => d.maker_id === workspace.user.id)
                  .map((d) => (
                    <p className="mvp-notice" key={d.id}>
                      {formatMoney(d.amount, language)} · {d.giving_type} ·{" "}
                      {workflowLabel(d.status, language)} · {d.purpose}
                    </p>
                  ))}
              </div>
            )}
            {tab === "review" && (
              <div className="mvp-stack">
                {workspace.documents.map((d) => (
                  <a
                    key={d.id}
                    className="text-link"
                    href={`/api/documents?id=${d.id}`}
                  >
                    {t("Review private evidence", "Kagua ushahidi binafsi")} ·{" "}
                    {
                      workspace.organizations.find(
                        (o) => o.id === d.organization_id,
                      )?.name
                    }
                  </a>
                ))}
                <p className="mvp-notice">
                  {t(
                    "Record what you checked. Never include private identities in public verification summaries. You cannot approve your own submissions.",
                    "Rekodi ulichokagua. Usiweke utambulisho binafsi katika muhtasari wa umma. Huwezi kuidhinisha maombi yako mwenyewe.",
                  )}
                </p>
                {has("admin", "verifier") && (
                  <>
                    {workspace.organizations
                      .filter(
                        (o) =>
                          o.status === "pending" || o.status === "verified",
                      )
                      .map((o) => (
                        <section key={o.id}>
                          <h3>
                            {o.name} · {o.registration}
                          </h3>
                          <p>{o.description}</p>
                          {review(
                            "organization",
                            o.id,
                            t("Organization review", "Ukaguzi wa shirika"),
                          )}
                        </section>
                      ))}
                    {workspace.campaigns
                      .filter((c) =>
                        ["pending", "published"].includes(c.status),
                      )
                      .map((c) => (
                        <section key={c.id}>
                          <h3>{c.title}</h3>
                          <p>{c.story}</p>
                          <p>
                            {t("Budget", "Bajeti")}:{" "}
                            {c.budget
                              .map(
                                (b) =>
                                  `${b.label}: ${formatMoney(b.amount, language)}`,
                              )
                              .join(" · ")}
                          </p>
                          {review(
                            "campaign",
                            c.id,
                            t("Campaign review", "Ukaguzi wa mradi"),
                          )}
                        </section>
                      ))}
                    {workspace.updates
                      .filter((u) => u.status === "pending")
                      .map((u) => (
                        <section key={u.id}>
                          <h3>{u.title}</h3>
                          <p>{u.body}</p>
                          {review(
                            "update",
                            u.id,
                            t("Update review", "Ukaguzi wa taarifa"),
                          )}
                        </section>
                      ))}
                  </>
                )}
                {has("shariah") && (
                  <>
                    <ActionForm
                      title={t(
                        "Publish a reviewed Zakat policy",
                        "Chapisha sera ya Zaka iliyokaguliwa",
                      )}
                      language={language}
                      fields={[
                        {
                          name: "title",
                          en: "Policy title and version",
                          sw: "Kichwa na toleo la sera",
                        },
                        {
                          name: "content",
                          en: "Policy text · include English and Kiswahili",
                          sw: "Maandishi ya sera · Kiingereza na Kiswahili",
                          type: "textarea",
                        },
                      ]}
                      onSave={(d) => save("policy", d)}
                    />
                    {workspace.campaigns.map((c) => (
                      <section key={c.id}>
                        <h3>{c.title}</h3>
                        <p>{c.story}</p>
                        {review(
                          "zakat",
                          c.id,
                          t(
                            "Zakat eligibility review",
                            "Ukaguzi wa ustahiki wa Zaka",
                          ),
                        )}
                      </section>
                    ))}
                  </>
                )}
              </div>
            )}
            {tab === "finance" && (
              <div className="mvp-stack">
                {has("admin", "finance") &&
                  workspace.refunds
                    .filter((r) =>
                      ["requested", "checked", "approved"].includes(r.status),
                    )
                    .map((r) => (
                      <ActionForm
                        key={r.id}
                        title={
                          t("Refund review", "Ukaguzi wa kurejesha fedha") +
                          " · " +
                          r.reason
                        }
                        language={language}
                        fields={[
                          {
                            name: "step",
                            en: "Action (external refunds must be reconciled before recording)",
                            sw: "Hatua (linganisha marejesho kabla ya kurekodi)",
                            options: [
                              ...(has("admin") && r.status === "requested"
                                ? [
                                    {
                                      value: "check",
                                      label: t("Check request", "Kagua ombi"),
                                    },
                                  ]
                                : []),
                              ...(has("finance") && r.status === "checked"
                                ? [
                                    {
                                      value: "approve",
                                      label: t(
                                        "Approve refund",
                                        "Idhinisha marejesho",
                                      ),
                                    },
                                  ]
                                : []),
                              ...(has("finance") && r.status === "approved"
                                ? [
                                    {
                                      value: "refunded",
                                      label: t(
                                        "Record reconciled external refund",
                                        "Rekodi marejesho yaliyolinganishwa",
                                      ),
                                    },
                                  ]
                                : []),
                              { value: "reject", label: t("Reject", "Kataa") },
                            ],
                          },
                          {
                            name: "provider_reference",
                            en: "Unique refund statement reference",
                            sw: "Rejeleo la kipekee la marejesho",
                            optional: true,
                          },
                        ]}
                        onSave={(d) =>
                          save("refund_review", { ...d, id: r.id })
                        }
                      />
                    ))}
                {has("finance") && (
                  <button
                    className="button"
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/reconcile", {
                          method: "POST",
                        });
                        if (!r.ok)
                          throw new Error(
                            t(
                              "Reconciliation unavailable",
                              "Ulinganishaji haupatikani",
                            ),
                          );
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {t(
                      "Recheck pending provider confirmations",
                      "Kagua tena uthibitisho unaosubiri",
                    )}
                  </button>
                )}
                <p className="mvp-notice">
                  {t(
                    "Reconcile against actual provider and bank statements. Recording a transfer here does not send money. Maker, checker and approver must be different people.",
                    "Linganisha na taarifa halisi za mtoa huduma na benki. Kurekodi hapa hakutumi fedha. Muombaji, mkaguzi na mwidhinishaji lazima wawe watu tofauti.",
                  )}
                </p>
                {has("finance") && (
                  <ActionForm
                    title={t(
                      "Record a reconciled settlement",
                      "Rekodi fedha zilizolinganishwa",
                    )}
                    language={language}
                    fields={[
                      {
                        name: "donation_id",
                        en: "Confirmed, unsettled donation",
                        sw: "Mchango uliothibitishwa usiolinganishwa",
                        options: workspace.donations
                          .filter(
                            (d) =>
                              d.status === "confirmed" &&
                              !workspace.settlements.some(
                                (s) => s.donation_id === d.id,
                              ),
                          )
                          .map((d) => ({
                            value: d.id,
                            label: `${d.id} · ${formatMoney(d.amount, language)}`,
                          })),
                      },
                      {
                        name: "bank_reference",
                        en: "Unique bank statement reference (gross donation)",
                        sw: "Rejeleo la kipekee la taarifa ya benki (mchango kamili)",
                      },
                    ]}
                    onSave={(d) => save("settle", d)}
                  />
                )}
                {workspace.disbursements.map((d) => (
                  <section key={d.id} className="mvp-light-card">
                    <h3>
                      {formatMoney(d.amount, language)} · {d.giving_type}
                    </h3>
                    <p>
                      {d.purpose} · {d.recipient_reference}
                    </p>
                    <p>{workflowLabel(d.status, language)}</p>
                    {["requested", "checked", "approved"].includes(
                      d.status,
                    ) && (
                      <ActionForm
                        title={t(
                          "Independent release control",
                          "Udhibiti huru wa kutoa fedha",
                        )}
                        language={language}
                        fields={[
                          {
                            name: "step",
                            en: "Action",
                            sw: "Hatua",
                            options: [
                              ...(d.status === "requested" &&
                              has("admin", "verifier")
                                ? [
                                    {
                                      value: "check",
                                      label: t(
                                        "Check evidence and recipient",
                                        "Kagua ushahidi na mpokeaji",
                                      ),
                                    },
                                  ]
                                : []),
                              ...(d.status === "checked" && has("finance")
                                ? [
                                    {
                                      value: "approve",
                                      label: t(
                                        "Approve release",
                                        "Idhinisha kutolewa",
                                      ),
                                    },
                                  ]
                                : []),
                              ...(d.status === "approved" && has("finance")
                                ? [
                                    {
                                      value: "paid",
                                      label: t(
                                        "Record completed external transfer",
                                        "Rekodi malipo yaliyokamilika",
                                      ),
                                    },
                                  ]
                                : []),
                              {
                                value: "reject",
                                label: t("Reject request", "Kataa ombi"),
                              },
                            ],
                          },
                          {
                            name: "bank_reference",
                            en: "Transfer reference (required when recording payment)",
                            sw: "Rejeleo la malipo (lazima ukirekodi malipo)",
                            optional: true,
                          },
                        ]}
                        onSave={(data) =>
                          save("release", { ...data, id: d.id })
                        }
                      />
                    )}
                  </section>
                ))}
                {has("admin") &&
                  workspace.flags
                    .filter((f) => !f.resolved_by)
                    .map((f) => (
                      <ActionForm
                        key={f.id}
                        title={f.reason}
                        language={language}
                        fields={[note]}
                        onSave={(d) => save("resolve_flag", { ...d, id: f.id })}
                      />
                    ))}
                {has("finance", "auditor") && (
                  <>
                    <h3>
                      {t("Restricted ledger", "Daftari la fedha zilizotengwa")}
                    </h3>
                    <div className="mvp-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {[
                              t("Fund", "Mfuko"),
                              t("Account", "Akaunti"),
                              t("Debit (KSh)", "Debiti (KSh)"),
                              t("Credit (KSh)", "Krediti (KSh)"),
                            ].map((x) => (
                              <th key={x}>{x}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {workspace.ledger.map((l) => (
                            <tr key={l.id}>
                              <td>
                                <span className="mvp-reference">
                                  {l.campaign_id}
                                </span>
                                {l.giving_type}
                              </td>
                              <td>{l.account}</td>
                              <td>{formatMoney(l.debit, language)}</td>
                              <td>{formatMoney(l.credit, language)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
            {tab === "notifications" && (
              <div className="mvp-stack">
                <button
                  className="button"
                  onClick={() =>
                    save("read_notifications", {}).catch((e) =>
                      setError(e.message),
                    )
                  }
                >
                  {t("Mark all as read", "Weka zote zimesomwa")}
                </button>
                {!workspace.notifications.length && (
                  <p>{t("You’re all caught up.", "Hakuna arifa mpya.")}</p>
                )}
                {workspace.notifications.map((n) => (
                  <article className="mvp-light-card" key={n.id}>
                    <p className="eyebrow">
                      {n.read_at ? t("Read", "Imesomwa") : t("New", "Mpya")}
                    </p>
                    <h3>{language === "sw" ? n.title_sw : n.title}</h3>
                    <p>{language === "sw" ? n.body_sw : n.body}</p>
                    <time>{new Date(n.created_at).toLocaleString()}</time>
                  </article>
                ))}
              </div>
            )}
            {tab === "profile" && (
              <div className="mvp-stack">
                <ActionForm
                  title={t("Your preferences", "Mapendeleo yako")}
                  language={language}
                  fields={[
                    {
                      name: "name",
                      en: "Display name",
                      sw: "Jina la kuonyesha",
                      value: workspace.profile?.display_name,
                    },
                    {
                      name: "language",
                      en: "Preferred language",
                      sw: "Lugha",
                      value: workspace.profile?.language || language,
                      options: [
                        { value: "en", label: "English" },
                        { value: "sw", label: "Kiswahili" },
                      ],
                    },
                    {
                      name: "marketing",
                      en: "Optional marketing messages",
                      sw: "Ujumbe wa matangazo (si lazima)",
                      value: workspace.profile?.marketing_opt_in
                        ? "true"
                        : "false",
                      options: [
                        {
                          value: "false",
                          label: t("No, thank you", "Hapana, asante"),
                        },
                        {
                          value: "true",
                          label: t("Yes, opt in", "Ndiyo, nakubali"),
                        },
                      ],
                    },
                  ]}
                  onSave={(d) =>
                    save("profile", { ...d, marketing: d.marketing === "true" })
                  }
                />
                <p>
                  {t(
                    "Essential payment and security records remain available in your account. Marketing consent is separate.",
                    "Rekodi muhimu za malipo na usalama zinabaki katika akaunti yako. Ridhaa ya matangazo ni tofauti.",
                  )}
                </p>
                <button className="button" onClick={() => setState("mfa")}>
                  {t(
                    "Set up / verify two-factor security",
                    "Weka / thibitisha usalama wa hatua mbili",
                  )}
                </button>
              </div>
            )}
            {tab === "support" && (
              <div className="mvp-stack">
                <ActionForm
                  title={t(
                    "Request review of a full refund",
                    "Omba ukaguzi wa kurejeshewa fedha zote",
                  )}
                  language={language}
                  fields={[
                    {
                      name: "donation_id",
                      en: "Confirmed donation",
                      sw: "Mchango uliothibitishwa",
                      options: ownDonations
                        .filter(
                          (d) =>
                            d.status === "confirmed" &&
                            !workspace.refunds.some(
                              (r) => r.donation_id === d.id,
                            ),
                        )
                        .map((d) => ({
                          value: d.id,
                          label: formatMoney(d.amount, language) + " · " + d.id,
                        })),
                    },
                    {
                      name: "reason",
                      en: "Reason for review",
                      sw: "Sababu ya ukaguzi",
                      type: "textarea",
                    },
                  ]}
                  onSave={(d) => save("refund_request", d)}
                />
                {workspace.refunds.map((r) => (
                  <article className="mvp-light-card" key={r.id}>
                    <p>{r.reason}</p>
                    <p>{workflowLabel(r.status, language)}</p>
                  </article>
                ))}
                <ActionForm
                  title={t(
                    "Report a concern or request support",
                    "Ripoti tatizo au omba usaidizi",
                  )}
                  language={language}
                  fields={[
                    {
                      name: "campaign_id",
                      en: "Campaign (optional)",
                      sw: "Mradi (si lazima)",
                      optional: true,
                      options: campaignOptions,
                    },
                    {
                      name: "body",
                      en: "Describe your concern, payment issue or privacy request",
                      sw: "Eleza tatizo la mchango, malipo au ombi la faragha",
                      type: "textarea",
                    },
                  ]}
                  onSave={(d) => save("complaint", d)}
                />
                {workspace.complaints.map((c) => (
                  <article className="mvp-light-card" key={c.id}>
                    <p>{c.body}</p>
                    <p>
                      {workflowLabel(c.status, language)} · {c.resolution}
                    </p>
                    {has("support", "admin") && c.status === "open" && (
                      <ActionForm
                        title={t("Resolve concern", "Tatua tatizo")}
                        language={language}
                        fields={[note]}
                        onSave={(d) =>
                          save("resolve_complaint", { ...d, id: c.id })
                        }
                      />
                    )}
                  </article>
                ))}
              </div>
            )}
            {tab === "audit" && (
              <div className="mvp-stack">
                <h3>
                  {t(
                    "Append-only activity record",
                    "Rekodi ya shughuli isiyobadilishwa",
                  )}
                </h3>
                {workspace.audit.map((a) => (
                  <div className="mvp-light-card" key={a.id}>
                    <strong>{a.action}</strong>
                    <p className="mvp-reference">{a.entity_id}</p>
                    <time>{new Date(a.created_at).toLocaleString()}</time>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
