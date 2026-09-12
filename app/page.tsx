"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/use-language";
import Image from "next/image";
import Trace from "./components/Trace";
import SiteHeader from "./SiteHeader";
import AmanahLogo from "./AmanahLogo";
import Icon from "./Icon";
import Modal from "./components/Modal";
import Checkout from "./components/Checkout";
import { campaignAvailability } from "@/lib/presentation";
import {
  Campaign,
  Organization,
  Policy,
  Update,
  formatMoney,
} from "@/lib/domain";
type Catalog = {
  configured: boolean;
  campaigns: Campaign[];
  organizations: Organization[];
  updates: Update[];
  policies: Policy[];
  payments: { mpesa: boolean; stripe: boolean };
};
export default function Home() {
  const [language, setLanguage] = useLanguage();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [organization, setOrganization] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("recent");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [giving, setGiving] = useState<Campaign | null>(null);
  const [policy, setPolicy] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const t = (en: string, sw: string) => (language === "sw" ? sw : en);
  async function load() {
    try {
      const r = await fetch("/api/catalog", { cache: "no-store" });
      const d = (await r.json()) as Catalog;
      if (!r.ok) throw new Error();
      setCatalog(d);
      setError("");
    } catch {
      setError("unavailable");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<Catalog>;
      })
      .then(setCatalog)
      .catch((e) => {
        if (e.name !== "AbortError") setError("unavailable");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
  }, [language]);
  const campaigns = (catalog?.campaigns || []).filter(
    (c) =>
      (!location || c.location === location) &&
      (!organization || c.organization_id === organization) &&
      (availability === "all" || campaignAvailability(c) === availability) &&
      (filter === "All" ||
        c.category === filter ||
        (filter === "Zakat" && c.zakat_eligible)) &&
      query
        .toLowerCase()
        .split(/\s+/)
        .every((word) =>
          `${c.title} ${c.title_sw} ${c.category} ${c.location}`
            .toLowerCase()
            .includes(word),
        ),
  ).sort((a, b) => sort === "closing" ? a.end_date.localeCompare(b.end_date) : sort === "needed" ? a.raised / a.goal - b.raised / b.goal : 0);
  const hasFilters = Boolean(query || filter !== "All" || location || organization || availability !== "all");
  const resetFilters = () => { setQuery(""); setFilter("All"); setLocation(""); setOrganization(""); setAvailability("all"); setSort("recent"); };
  const labels = {
    causes: t("Causes", "Miradi"),
    zakat: t("Zakat", "Zaka"),
    impact: t("Impact", "Matokeo"),
    how: t("How it works", "Jinsi inavyofanya kazi"),
    sign: t("My giving", "Sadaka zangu"),
    give: t("Give now", "Toa sasa"),
  };
  const explore = () => {
    document.getElementById("causes")?.scrollIntoView();
    search.current?.focus({ preventScroll: true });
  };
  const account = () => window.location.assign("/workspace");
  return (
    <main className="mvp-home">
      <a href="#causes" className="mvp-skip">
        {t("Skip to campaigns", "Nenda kwenye miradi")}
      </a>
      <div className="trustbar">
        {t("Give with amanah", "Toa kwa uaminifu")} <span>•</span>{" "}
        {t("Follow your impact", "Fuatilia matokeo")}
      </div>
      <SiteHeader
        labels={labels}
        language={language}
        onLanguage={() => setLanguage(language === "en" ? "sw" : "en")}
        onSearch={explore}
        onNotifications={() => window.location.assign("/workspace#notifications")}
        onAccount={account}
        onGive={explore}
        onPlatform={account}
      />
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            {t(
              "Give with amanah. See the impact.",
              "Toa kwa uaminifu. Ona matokeo.",
            )}
          </p>
          <h1>
            {t("Give for the sake of Allah.", "Toa kwa ajili ya Allah.")}{" "}
            <em>{t("Change a life.", "Badilisha maisha.")}</em>
          </h1>
          <p className="hero-lead">
            {t(
              "Thoughtful Islamic giving, with a clear record from your donation to delivery.",
              "Sadaka ya Kiislamu yenye nia njema na rekodi wazi kutoka mchango hadi utekelezaji.",
            )}
          </p>
          <div className="hero-actions">
            <button className="button" onClick={explore}>
              {labels.give} <Icon name="↗" />
            </button>
            <a className="text-link" href="#how">
              {labels.how} <Icon name="↓" />
            </a>
          </div>
          <div className="hero-proof">
            <span>
              <Icon name="shield" /> {t("Independent reviews", "Ukaguzi huru")}
            </span>
            <span>
              <Icon name="heart" /> {t("Private giving", "Sadaka binafsi")}
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            width={1200}
            height={1200}
            sizes="(max-width: 800px) 100vw, 50vw"
            preload
            src="/water-community.jpg"
            alt={t(
              "Children at a community water point",
              "Watoto kwenye kisima cha jamii",
            )}
          />
          <div className="hero-caption">
            <span>AMANAH GIVING</span>
            <p>
              {t(
                "Every gift begins with an intention.",
                "Kila mchango huanza na nia.",
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="section" id="causes">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {t("Purposeful giving", "Sadaka yenye kusudi")}
            </p>
            <h2>
              {t(
                "Find a cause close to your heart.",
                "Pata mradi unaougusa moyo wako.",
              )}
            </h2>
          </div>
        </div>
        <label className="mvp-search">
          {t("Search by cause or location", "Tafuta kwa aina au eneo")}
          <input
            ref={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "Water Garissa, food, education…",
              "Maji Garissa, chakula, elimu…",
            )}
          />
        </label>
        <div className="mvp-filters">
          <label>{t("Location", "Eneo")}<select value={location} onChange={e => setLocation(e.target.value)}><option value="">{t("All locations", "Maeneo yote")}</option>{Array.from(new Set(catalog?.campaigns.map(c => c.location))).sort().map(x => <option key={x}>{x}</option>)}</select></label>
          <label>{t("Organization", "Shirika")}<select value={organization} onChange={e => setOrganization(e.target.value)}><option value="">{t("All organizations", "Mashirika yote")}</option>{catalog?.organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
          <label>{t("Availability", "Hali ya mradi")}<select value={availability} onChange={e => setAvailability(e.target.value)}><option value="all">{t("All campaigns", "Miradi yote")}</option><option value="open">{t("Accepting gifts", "Inapokea michango")}</option><option value="funded">{t("Fully funded", "Imefadhiliwa kikamilifu")}</option><option value="closed">{t("Closed", "Imefungwa")}</option></select></label>
          <label>{t("Sort by", "Panga kwa")}<select value={sort} onChange={e => setSort(e.target.value)}><option value="recent">{t("Newest", "Mipya zaidi")}</option><option value="closing">{t("Closing soon", "Inafungwa karibuni")}</option><option value="needed">{t("Least funded", "Ufadhili mdogo")}</option></select></label>
        </div>
        <div className="filter-row">
          {[
            ["All", "Yote"],
            ["Zakat", "Zaka"],
            ["Food", "Chakula"],
            ["Orphans", "Mayatima"],
            ["Water", "Maji"],
            ["Mosque", "Msikiti"],
            ["Education", "Elimu"],
            ["Emergency", "Dharura"],
            ["Health", "Afya"],
          ].map(([en, sw]) => (
            <button
              key={en}
              aria-pressed={filter === en}
              className={filter === en ? "active" : ""}
              onClick={() => setFilter(en)}
            >
              {t(en, sw)}
            </button>
          ))}
        </div>
        {catalog && <div className="mvp-row mvp-results" role="status"><span>{campaigns.length} {t("campaigns", "miradi")}</span>{hasFilters && <button className="text-link" onClick={resetFilters}>{t("Clear filters", "Ondoa vichujio")}</button>}</div>}
        {!catalog && !error && (
          <p role="status">{t("Loading campaigns…", "Inapakia miradi…")}</p>
        )}
        {error && (
          <div className="mvp-notice" role="alert">
            <p>
              {t(
                "We couldn’t load campaigns. Please try again.",
                "Imeshindikana kupakia miradi. Tafadhali jaribu tena.",
              )}
            </p>
            <button className="button" onClick={load}>
              {t("Retry", "Jaribu tena")}
            </button>
          </div>
        )}
        {catalog && !campaigns.length && (
          <div className="empty-state">
            <Icon name="heart" />
            <h3>
              {hasFilters
                ? t("No matching campaigns", "Hakuna miradi inayolingana")
                : t(
                    "Good things begin with trust.",
                    "Mambo mazuri huanza kwa uaminifu.",
                  )}
            </h3>
            <p>
              {hasFilters
                ? t(
                    "Try another cause or location.",
                    "Jaribu aina nyingine au eneo jingine.",
                  )
                : t(
                    "Our first campaigns will appear after their organizations, budgets, and needs have been reviewed.",
                    "Miradi ya kwanza itaonekana baada ya mashirika, bajeti na mahitaji kukaguliwa.",
                  )}
            </p>
            <a className="text-link" href="/workspace">
              {t("Register your organization", "Sajili shirika lako")}{" "}
              <Icon name="→" />
            </a>
          </div>
        )}
        <div className="campaign-grid">
          {campaigns.map((c) => (
            <article className="campaign-card" key={c.id}>
              <div className="campaign-image">
                <Image
                  width={600}
                  height={400}
                  sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 25vw"
                  src={c.image}
                  alt=""
                />
                <span className="badge">
                  {c.zakat_eligible
                    ? t("Zakat eligible", "Unastahiki Zaka")
                    : "Sadaqah"}
                </span>
              </div>
              <div className="campaign-body">
                <p className="verified">
                  <Icon name="shield" />{" "}
                  {t(
                    "Campaign verified · Level 2",
                    "Mradi umethibitishwa · Kiwango 2",
                  )}
                </p>
                <h3>{language === "sw" ? c.title_sw : c.title}</h3>
                <p className="muted">
                  {c.location} · {c.donor_count} {t("donors", "wachangiaji")}
                </p>
                <div className="money-row">
                  <strong>{formatMoney(c.raised, language)}</strong>
                  <span>
                    {t("of", "kati ya")} {formatMoney(c.goal, language)}
                  </span>
                </div>
                <progress
                  className="mvp-progress"
                  aria-label={t("Campaign funding", "Ufadhili wa mradi")}
                  value={Math.min(c.raised, c.goal)}
                  max={c.goal}
                />
                <p className="mvp-row"><span>{Math.min(100, Math.round(c.raised / c.goal * 100))}% {t("funded", "imefadhiliwa")}</span><span>{campaignAvailability(c, now) === "open" ? `${Math.max(0, Math.ceil((Date.parse(c.end_date + "T23:59:59Z") - now) / 86400000))} ${t("days left", "siku zimebaki")}` : campaignAvailability(c, now) === "funded" ? t("Fully funded", "Umefadhiliwa") : t("Closed", "Umefungwa")}</span></p>
                <div className="card-footer">
                  <button onClick={() => setSelected(c)}>
                    {t("View details", "Ona maelezo")}
                  </button>
                  <button
                    className="donate-mini"
                    disabled={
                      campaignAvailability(c) !== "open"
                    }
                    onClick={() => setGiving(c)}
                  >
                    {campaignAvailability(c) === "closed" ? t("Closed", "Umefungwa") : c.raised >= c.goal
                      ? t("Fully funded", "Umefadhiliwa")
                      : t("Donate", "Changia")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="zakat-section" id="zakat">
        <div className="zakat-copy">
          <p className="eyebrow light">
            {t("Your intention stays clear", "Nia yako inabaki wazi")}
          </p>
          <h2>
            {t("Zakat, carefully protected.", "Zaka inalindwa kwa uangalifu.")}
          </h2>
          <p>
            {t(
              "Zakat is recorded separately and restricted to eligible campaigns. Each eligibility decision links to an approved policy version.",
              "Zaka hurekodiwa kando na kutengwa kwa miradi inayostahiki. Kila uamuzi wa ustahiki unaunganishwa na toleo la sera iliyoidhinishwa.",
            )}
          </p>
          <button
            className="button sand"
            onClick={() => {
              setFilter("Zakat");
              explore();
            }}
          >
            {t("Explore Zakat campaigns", "Angalia miradi ya Zaka")}{" "}
            <Icon name="→" />
          </button>
        </div>
        <div className="mvp-light-card">
          <AmanahLogo />
          <h3>{t("Clarity before you give", "Uwazi kabla ya kutoa")}</h3>
          <p>
            {t(
              "A mosque or water project is not automatically Zakat eligible. An independent reviewer must assess the specific case.",
              "Mradi wa msikiti au maji haustahiki Zaka moja kwa moja. Mkaguzi huru lazima atathmini hali maalum.",
            )}
          </p>
          <button className="text-link" onClick={() => setPolicy(true)}>
            {t("Read our published policies", "Soma sera zilizochapishwa")}{" "}
            <Icon name="↗" />
          </button>
        </div>
      </section>
      <section className="section" id="impact">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {t("Evidence, not estimates", "Ushahidi halisi")}
            </p>
            <h2>{t("Follow what happens next.", "Fuatilia kinachofuata.")}</h2>
          </div>
          <a className="text-link" href="/workspace">
            {t("Your donation history", "Historia ya michango yako")}{" "}
            <Icon name="→" />
          </a>
        </div>
        <div className="mvp-grid">
          {catalog?.updates.map((u) => (
            <article className="mvp-light-card" key={u.id}>
              <p className="verified">
                <Icon name="shield" />{" "}
                {t("Update reviewed", "Taarifa imekaguliwa")}
              </p>
              <h3>{language === "sw" ? u.title_sw : u.title}</h3>
              <p>{language === "sw" ? u.body_sw : u.body}</p>
              <time>
                {new Date(u.created_at).toLocaleDateString(
                  language === "sw" ? "sw-KE" : "en-KE",
                )}
              </time>
            </article>
          ))}
        </div>
        {!catalog?.updates.length && (
          <p className="mvp-notice">
            {t(
              "Verified project updates will appear as campaigns progress.",
              "Taarifa zilizothibitishwa zitaonekana wakati miradi inaendelea.",
            )}
          </p>
        )}
      </section>
      <section className="promise-strip">
        <div className="promise-mark">
          <AmanahLogo variant="light" size="lg" showTagline={false} />
        </div>
        <div>
          <p className="eyebrow light">
            {t("The Amanah promise", "Ahadi ya Amanah")}
          </p>
          <h2>
            {t(
              "Your intention stays clear. Your gift stays accountable.",
              "Nia yako inabaki wazi. Mchango wako unawajibikiwa.",
            )}
          </h2>
        </div>
        <div className="promise-points">
          {[
            t("Giving type recorded", "Aina ya mchango inarekodiwa"),
            t("Funds restricted correctly", "Fedha zinatengwa ipasavyo"),
            t("Independent release approvals", "Idhini huru ya kutoa fedha"),
            t("Verified project updates", "Taarifa zilizothibitishwa"),
          ].map((x, i) => (
            <span key={x}>
              <b>0{i + 1}</b>
              {x}
            </span>
          ))}
        </div>
      </section>
      <section className="section" id="how">
        <p className="eyebrow">{labels.how}</p>
        <h2>
          {t(
            "A clear path from giving to delivery.",
            "Njia wazi kutoka kutoa hadi utekelezaji.",
          )}
        </h2>
        <div className="mvp-grid">
          {[
            [
              t("Choose a reviewed cause", "Chagua mradi uliokaguliwa"),
              t(
                "Read the need, budget, organization and eligibility.",
                "Soma mahitaji, bajeti, shirika na ustahiki.",
              ),
            ],
            [
              t("Give securely", "Toa kwa usalama"),
              t(
                "A receipt appears only after verified payment.",
                "Risiti hutolewa baada ya malipo kuthibitishwa.",
              ),
            ],
            [
              t("Follow the record", "Fuatilia rekodi"),
              t(
                "See receipts, project updates and notifications in My Giving.",
                "Ona risiti, taarifa za mradi na arifa katika Sadaka zangu.",
              ),
            ],
          ].map(([a, b], i) => (
            <article className="mvp-light-card" key={a}>
              <p className="eyebrow">0{i + 1}</p>
              <h3>{a}</h3>
              <p>{b}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="organizations">
        <div>
          <p className="eyebrow light">
            {t("Verified organizations", "Mashirika yaliyothibitishwa")}
          </p>
          <h2>
            {t(
              "Trusted locally. Accountable publicly.",
              "Kuaminiwa na jamii. Kuwajibika kwa umma.",
            )}
          </h2>
          <a className="outline-button" href="/workspace">
            {t("For organizations", "Kwa mashirika")} <Icon name="→" />
          </a>
        </div>
        <div className="mvp-stack">
          {catalog?.organizations.map((o) => (
            <article className="org-card" key={o.id}>
              <Icon name="shield" />
              <div>
                <h3>{o.name}</h3>
                <p>{o.location}</p>
                <p>{o.verification_summary}</p>
                <button className="text-link" onClick={() => setSelectedOrganization(o)}>{t("View organization", "Ona shirika")} <Icon name="→" /></button>
              </div>
            </article>
          ))}
          {!catalog?.organizations.length && (
            <p>
              {t(
                "Profiles are published after independent verification.",
                "Wasifu huchapishwa baada ya uthibitishaji huru.",
              )}
            </p>
          )}
        </div>
      </section>
      <footer>
        <div className="footer-brand">
          <AmanahLogo variant="light" />
          <p>
            {t(
              "Transparent, purposeful Islamic giving.",
              "Sadaka ya Kiislamu yenye uwazi na kusudi.",
            )}
          </p>
        </div>
        <div>
          <b>{t("Give", "Toa")}</b>
          <a href="#causes">{labels.causes}</a>
          <a href="#zakat">{labels.zakat}</a>
        </div>
        <div>
          <b>{t("Your account", "Akaunti yako")}</b>
          <a href="/workspace">{labels.sign}</a>
          <a href="/workspace">
            {t("Contact support", "Wasiliana na usaidizi")}
          </a>
        </div>
        <div>
          <b>{t("Trust", "Uaminifu")}</b>
          <a href="/policies">
            {t("Privacy & giving terms", "Faragha na masharti")}
          </a>
          <button onClick={() => setPolicy(true)}>
            {t("Zakat policies", "Sera za Zaka")}
          </button>
        </div>
      </footer>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Amanah Giving · Kenya</span>
        <span>English · Kiswahili</span>
      </div>
      {selected && (
        <Modal
          title={t("Campaign details", "Maelezo ya mradi")}
          onClose={() => setSelected(null)}
        >
          <div className="mvp-form">
            <Image className="mvp-detail-image" src={selected.image} width={900} height={500} sizes="(max-width: 700px) 90vw, 640px" alt="" />
            <p className="verified">
              {t(
                "Campaign verified · Level 2",
                "Mradi umethibitishwa · Kiwango 2",
              )}
            </p>
            <h2>{language === "sw" ? selected.title_sw : selected.title}</h2>
            <div className="mvp-row"><strong>{formatMoney(selected.raised, language)} {t("of", "kati ya")} {formatMoney(selected.goal, language)}</strong><span>{selected.donor_count} {t("donors", "wachangiaji")}</span></div>
            <progress className="mvp-progress" value={Math.min(selected.raised, selected.goal)} max={selected.goal} aria-label={t("Campaign funding", "Ufadhili wa mradi")} />
            <p>{t("Organized by", "Imeandaliwa na")}: {catalog?.organizations.find(o => o.id === selected.organization_id)?.name || t("Verified organization", "Shirika lililothibitishwa")}</p>
            <p className="mvp-prewrap">{language === "sw" ? selected.story_sw : selected.story}</p>
            <p>
              {selected.location} · {t("Closing", "Mwisho")}:{" "}
              {selected.end_date}
            </p>
            <h3>{t("Budget", "Bajeti")}</h3>
            {selected.budget.map((b, i) => (
              <div className="mvp-row" key={i}>
                <span>{b.label}</span>
                <strong>{formatMoney(b.amount, language)}</strong>
              </div>
            ))}
            <Trace campaign={selected.id} language={language} />
            <h3>{t("Campaign updates", "Taarifa za mradi")}</h3>
            {catalog?.updates.filter(u => u.campaign_id === selected.id).map(u => <article className="mvp-light-card" key={u.id}><time dateTime={u.created_at}>{new Date(u.created_at).toLocaleDateString(language === "sw" ? "sw-KE" : "en-KE")}</time><h4>{language === "sw" ? u.title_sw : u.title}</h4><p className="mvp-prewrap">{language === "sw" ? u.body_sw : u.body}</p></article>)}
            {!catalog?.updates.some(u => u.campaign_id === selected.id) && <p>{t("Reviewed updates will appear as this campaign progresses.", "Taarifa zilizokaguliwa zitaonekana mradi unapoendelea.")}</p>}
            <h3>{t("What was checked", "Kilichokaguliwa")}</h3>
            <p>{selected.verification_summary}</p>
            {selected.zakat_eligible && (
              <p>
                {t("Zakat policy", "Sera ya Zaka")}:{" "}
                {catalog?.policies.find((p) => p.id === selected.policy_id)
                  ?.title || selected.policy_id}
              </p>
            )}
            <div className="mvp-actions">
              <button
                className="button"
                disabled={campaignAvailability(selected) !== "open"}
                onClick={() => {
                  setGiving(selected);
                  setSelected(null);
                }}
              >
                {campaignAvailability(selected) === "open" ? labels.give : t("Closed to new gifts", "Umefungwa kwa michango mipya")} <Icon name="→" />
              </button>
              <a className="text-link" href="/workspace">
                {t(
                  "Save or report this campaign",
                  "Hifadhi au ripoti mradi huu",
                )}
              </a>
            </div>
          </div>
        </Modal>
      )}
      {selectedOrganization && <Modal title={t("Organization profile", "Wasifu wa shirika")} onClose={() => setSelectedOrganization(null)}><div className="mvp-form"><p className="verified"><Icon name="shield" /> {t("Organization verified · Level 3", "Shirika limethibitishwa · Kiwango 3")}</p><h2>{selectedOrganization.name}</h2><p>{selectedOrganization.location}</p><p className="mvp-prewrap">{selectedOrganization.description}</p><h3>{t("What was checked", "Kilichokaguliwa")}</h3><p>{selectedOrganization.verification_summary}</p><button className="button" onClick={() => { resetFilters(); setOrganization(selectedOrganization.id); setSelectedOrganization(null); explore(); }}>{t("View this organization’s campaigns", "Ona miradi ya shirika hili")} <Icon name="→" /></button></div></Modal>}
      <nav className="mvp-mobile-nav" aria-label={t("Quick navigation", "Urambazaji wa haraka")}><a href="#top"><Icon name="home" />{t("Home", "Nyumbani")}</a><button onClick={explore}><Icon name="search" />{t("Explore", "Angalia")}</button><button className="mvp-mobile-give" onClick={explore}><Icon name="heart" />{t("Give", "Toa")}</button><a href="#impact"><Icon name="shield" />{t("Impact", "Matokeo")}</a><a href="/workspace"><Icon name="user" />{t("Account", "Akaunti")}</a></nav>
      {giving && catalog && (
        <Modal
          title={t("Donation checkout", "Malipo ya mchango")}
          onClose={() => setGiving(null)}
        >
          <Checkout
            campaign={giving}
            language={language}
            methods={catalog.payments}
          />
        </Modal>
      )}
      {policy && (
        <Modal
          title={t("Zakat policies", "Sera za Zaka")}
          onClose={() => setPolicy(false)}
        >
          <div className="mvp-form">
            <h2>
              {t("Published Zakat policies", "Sera za Zaka zilizochapishwa")}
            </h2>
            {catalog?.policies.map((p) => (
              <article key={p.id}>
                <h3>{p.title}</h3>
                <p className="mvp-prewrap">{p.content}</p>
                <small>{new Date(p.created_at).toLocaleDateString()}</small>
              </article>
            ))}
            {!catalog?.policies.length && (
              <p>
                {t(
                  "Policies await qualified Shariah review. Zakat campaigns cannot accept gifts until an approved policy is linked.",
                  "Sera zinasubiri ukaguzi wa Sharia. Miradi ya Zaka haiwezi kupokea michango bila sera iliyoidhinishwa.",
                )}
              </p>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}
