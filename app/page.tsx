'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import PlatformConsole from './PlatformConsole';
import GivingPlanner from './GivingPlanner';

type Campaign = {
  id: string;
  title: string;
  category: string;
  meta: string;
  raised: number;
  goal: number;
  donors: number;
  days: number;
  image: string;
  badge: string;
  zakat: boolean;
  story: string;
};

const campaigns: Campaign[] = [
  { id: 'WTR-284', title: 'Clean water for Garissa families', category: 'Water', meta: 'Garissa, Kenya', raised: 3400000, goal: 5000000, donors: 1428, days: 12, image: '/water-community.jpg', badge: 'Urgent', zakat: false, story: 'A solar-powered borehole will bring safe water within reach of 340 people and reduce the daily journey made by families.' },
  { id: 'MSQ-112', title: 'Complete Al-Rahmah community mosque', category: 'Mosque', meta: 'Nairobi, Kenya', raised: 2100000, goal: 3600000, donors: 892, days: 24, image: '/mosque-community.jpg', badge: 'Sadaqah Jariyah', zakat: false, story: 'Complete the roof, water system and accessible prayer facilities for a growing community in Eastlands.' },
  { id: 'FOD-541', title: 'Food packs for 250 vulnerable homes', category: 'Food', meta: 'Mombasa, Kenya', raised: 840000, goal: 1250000, donors: 406, days: 6, image: '/food-community.jpg', badge: 'Most needed', zakat: true, story: 'Each family receives a complete staple-food package, delivered through two verified community partners.' },
  { id: 'ORP-2841', title: 'Keep 18 orphaned children learning', category: 'Orphans', meta: 'Kisumu, Kenya', raised: 612000, goal: 1080000, donors: 173, days: 31, image: '/water-children.jpg', badge: 'Zakat eligible', zakat: true, story: 'Private, identity-protected sponsorship for education, nutritious meals, healthcare and essential school supplies.' },
];

const money = (value: number) => value >= 1000000 ? `KSh ${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}M` : `KSh ${Math.round(value / 1000)}K`;

const copy = {
  en: { causes: 'Causes', zakat: 'Zakat', impact: 'Impact', how: 'How it works', sign: 'My giving', give: 'Give now', eyebrow: 'Give with amanah. See the impact.', titleA: 'Give for the sake of Allah.', titleB: 'Change a life.', lead: 'Verified Islamic giving with transparent impact, from your donation to delivery.' },
  sw: { causes: 'Miradi', zakat: 'Zaka', impact: 'Matokeo', how: 'Jinsi inavyofanya kazi', sign: 'Sadaka zangu', give: 'Toa sasa', eyebrow: 'Toa kwa uaminifu. Ona matokeo.', titleA: 'Toa kwa ajili ya Allah.', titleB: 'Badilisha maisha.', lead: 'Sadaka ya Kiislamu iliyothibitishwa, yenye uwazi kutoka mchango hadi matokeo.' },
  ar: { causes: 'المشاريع', zakat: 'الزكاة', impact: 'الأثر', how: 'كيف تعمل', sign: 'عطائي', give: 'تبرع الآن', eyebrow: 'أعطِ بأمانة. وشاهد الأثر.', titleA: 'أعطِ ابتغاء وجه الله.', titleB: 'غيّر حياة.', lead: 'عطاء إسلامي موثّق وشفاف، من تبرعك حتى وصول الأثر.' },
};

export default function Home() {
  const [language, setLanguage] = useState<'en' | 'sw' | 'ar'>('en');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [donationCampaign, setDonationCampaign] = useState<Campaign | null>(null);
  const [donationStep, setDonationStep] = useState(0);
  const [intention, setIntention] = useState('Sadaqah');
  const [amount, setAmount] = useState('1000');
  const [payment, setPayment] = useState('M-PESA');
  const [phone, setPhone] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [coverFees, setCoverFees] = useState(true);
  const [receipt, setReceipt] = useState<{ transaction: string; date: string } | null>(null);
  const [toast, setToast] = useState('');
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dedication, setDedication] = useState('');
  const [onBehalf, setOnBehalf] = useState(false);
  const [schedule, setSchedule] = useState('Monthly');
  const [platformTip, setPlatformTip] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [zakat, setZakat] = useState({ cash: '', gold: '', investments: '', business: '', receivables: '', liabilities: '' });

  const t = copy[language];
  const dialogOpen = searchOpen || !!selected || donationStep > 0 || dashboardOpen || platformOpen || plannerOpen || notificationsOpen;

  useEffect(() => {
    if (!dialogOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
    const frame = requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
      if (dialog && !dialog.contains(document.activeElement)) dialog.querySelector<HTMLElement>(focusable)?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
      const items = Array.from(dialog?.querySelectorAll<HTMLElement>(focusable) || []).filter(item => item.getClientRects().length);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', trapFocus);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [dialogOpen]);
  const filteredCampaigns = useMemo(() => campaigns.filter(campaign => {
    const matchesFilter = filter === 'All' || campaign.category === filter || (filter === 'Zakat' && campaign.zakat);
    const words = `${campaign.title} ${campaign.meta} ${campaign.category}`.toLowerCase();
    return matchesFilter && words.includes(query.toLowerCase());
  }), [filter, query]);

  const zakatNet = Object.entries(zakat).reduce((total, [key, value]) => total + (key === 'liabilities' ? -1 : 1) * (Number(value) || 0), 0);
  const nisab = 650000;
  const zakatDue = zakatNet >= nisab ? zakatNet * 0.025 : 0;

  useEffect(() => {
    const stored = localStorage.getItem('amanah-saved');
    if (stored) setSaved(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    const onScroll = () => setScrollProgress(Math.min(100, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight) * 100));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); setSelected(null); setDashboardOpen(false); setPlatformOpen(false); setPlannerOpen(false); setNotificationsOpen(false); setDonationStep(0); return; }
      if (document.querySelector('[aria-modal=true]') || (event.target as HTMLElement)?.matches('input,textarea,select')) return;
      if (event.key === '/') { event.preventDefault(); setSearchOpen(true); }
      if (event.key.toLowerCase() === 'g') startDonation();

    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey); };
  }, []);

  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    setSaved(next);
    localStorage.setItem('amanah-saved', JSON.stringify(next));
    setToast(next.includes(id) ? 'Campaign saved to My Giving' : 'Campaign removed');
  };

  const startDonation = (campaign?: Campaign | null, preset?: string) => {
    setDonationCampaign(campaign || null);
    setDonationStep(1);
    setReceipt(null);
    setIntention(preset || (campaign?.zakat ? 'Zakat' : 'Sadaqah'));
    setAmount('1000');
    setPhone('');
    setDedication('');
    setOnBehalf(false);
    setSchedule('Monthly');
    setPlatformTip(0);
  };

  const finishDonation = (event: FormEvent) => {
    event.preventDefault();
    setReceipt({ transaction: `AMN-${Date.now().toString().slice(-8)}`, date: new Intl.DateTimeFormat('en-KE', { dateStyle: 'long' }).format(new Date()) });
    setDonationStep(4);
  };

  return (
    <main>
      <div className="scroll-progress" aria-hidden="true"><span style={{width:`${scrollProgress}%`}}/></div>
      <div className="trustbar">Verified campaigns <span>•</span> Zakat funds kept separate <span>•</span> M-PESA ready</div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Amanah Giving home"><span className="brand-mark">A</span><span>AMANAH<small>GIVING</small></span></a>
        <nav aria-label="Main navigation"><a href="#causes">{t.causes}</a><a href="#zakat">{t.zakat}</a><a href="#impact">{t.impact}</a><a href="#how">{t.how}</a><button className="nav-platform" onClick={() => setPlatformOpen(true)}>Platform</button></nav>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Search campaigns">⌕</button>
          <button className="notify-button" onClick={() => setNotificationsOpen(true)} aria-label="Open notifications"><span>3</span>◉</button>
          <button className="language" onClick={() => setLanguage(language === 'en' ? 'sw' : language === 'sw' ? 'ar' : 'en')}>{language === 'en' ? 'SW' : language === 'sw' ? 'ع' : 'EN'}</button>
          <button className="account-link" onClick={() => setDashboardOpen(true)}>{t.sign}</button>
          <button className="button button-small" onClick={() => startDonation()}>{t.give}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.titleA} <em>{t.titleB}</em></h1>
          <p className="hero-lead">{t.lead}</p>
          <div className="quick-amounts" aria-label="Quick donation amounts">
            {['500', '1,000', '2,500', '5,000'].map(value => <button key={value} onClick={() => { startDonation(); setAmount(value.replace(',', '')); }}>KSh {value}</button>)}
            <button onClick={() => startDonation()}>Custom</button>
          </div>
          <div className="hero-actions"><button className="button" onClick={() => startDonation()}>{t.give} <span>↗</span></button><a className="text-link" href="#causes">Explore verified causes <span>↓</span></a></div>
          <div className="hero-proof"><span><b>4.9/5</b> donor trust</span><span><b>218</b> active campaigns</span><span><b>KSh 246M+</b> verified impact</span></div>
        </div>
        <div className="hero-visual">
          <img src="/water-community.jpg" alt="Children gathering at a rural community water well" />
          <div className="impact-card"><span className="status-dot" /> <b>Impact verified</b><p>Garissa water project now serves 340 people.</p><small>Evidence reviewed 2 days ago</small></div>
          <div className="live-giving"><span className="live-pulse"/><b>38 donors</b> gave in the last hour</div>
          <div className="hero-caption"><span>WTR-284 · SADAQAH JARIYAH</span><p>From your giving to safe, flowing water.</p><button onClick={() => setSelected(campaigns[0])}>Trace this project →</button></div>
        </div>
      </section>

      <section className="cause-strip" aria-label="Popular causes">
        {[['Zakat','✦'],['Food','◌'],['Orphans','♡'],['Water','≈'],['Mosque','⌂'],["Qur'ans",'◫']].map(([cause, icon]) => <button key={cause} onClick={() => { setFilter(cause === "Qur'ans" ? 'All' : cause); document.querySelector('#causes')?.scrollIntoView(); }}><span>{icon}</span>{cause === 'Food' ? 'Feed a family' : cause === 'Orphans' ? 'Sponsor an orphan' : cause === 'Water' ? 'Clean water' : cause === 'Mosque' ? 'Build a mosque' : cause}</button>)}
      </section>

      <section className="seasonal-giving">
        <div className="seasonal-heading"><p className="eyebrow">Give in every season</p><h2>Timely worship, thoughtfully prepared.</h2><p>Create plans for sacred days and recurring acts of generosity—without losing oversight or intention.</p><button className="text-link button-link" onClick={() => setPlannerOpen(true)}>Build my giving plan <span>↗</span></button></div>
        <div className="seasonal-track">{[
          ['NOW','Jumu’ah giving','Every Friday','A small, consistent Sadaqah can become a lasting rhythm.','Create weekly plan'],
          ['RAMADAN','Last 10 nights','Nightly giving','Schedule across the final nights so no opportunity is missed.','Prepare Ramadan plan'],
          ['DHUL HIJJAH','Qurbani','Verified distribution','Reserve ahead and follow verified livestock and distribution evidence.','Plan Qurbani'],
          ['ANY TIME','Fidyah & Kaffarah','Guided calculation','Understand the category, choose a verified program, and retain a receipt.','Open guided flow'],
        ].map((item,index) => <article key={item[1]} style={{'--delay':`${index * 90}ms`} as React.CSSProperties}><div className="season-icon">{index === 0 ? '☾' : index === 1 ? '✦' : index === 2 ? '◇' : '○'}</div><span>{item[0]}</span><h3>{item[1]}</h3><b>{item[2]}</b><p>{item[3]}</p><button onClick={() => setPlannerOpen(true)}>{item[4]} <em>↗</em></button></article>)}</div>
      </section>

      <section className="section" id="causes">
        <div className="section-heading"><div><p className="eyebrow">Verified opportunities</p><h2>Give where it matters most</h2></div><button className="text-link button-link" onClick={() => setSearchOpen(true)}>Search all causes <span>↗</span></button></div>
        <div className="filter-row">{['All','Zakat','Food','Orphans','Water','Mosque'].map(item => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="campaign-grid">
          {filteredCampaigns.map(campaign => {
            const progress = Math.round(campaign.raised / campaign.goal * 100);
            return <article className="campaign-card" key={campaign.id}>
              <div className="campaign-image"><img src={campaign.image} alt="" /><span className="badge">{campaign.badge}</span><button className={`save ${saved.includes(campaign.id) ? 'saved' : ''}`} onClick={() => toggleSaved(campaign.id)} aria-label={`Save ${campaign.title}`}>{saved.includes(campaign.id) ? '♥' : '♡'}</button></div>
              <div className="campaign-body"><p className="verified">● Campaign verified · {campaign.id}</p><h3>{campaign.title}</h3><p className="muted">{campaign.meta} · {campaign.donors.toLocaleString()} donors</p><div className="campaign-signals"><span>◷ {campaign.days} days left</span>{campaign.zakat && <span className="zakat-signal">✦ Zakat eligible</span>}</div><div className="money-row"><strong>{money(campaign.raised)}</strong><span>raised of {money(campaign.goal)}</span><b>{progress}%</b></div><div className="progress"><span style={{width: `${progress}%`}} /></div><div className="card-footer"><button onClick={() => setSelected(campaign)}>View details</button><button className="donate-mini" onClick={() => startDonation(campaign)}>Donate</button></div></div>
            </article>;
          })}
        </div>
        {!filteredCampaigns.length && <div className="empty-state">No verified campaigns match this search yet.</div>}
      </section>

      <section className="zakat-section" id="zakat">
        <div className="zakat-copy"><p className="eyebrow light">Dedicated Zakat Center</p><h2>Calculate with clarity.<br/>Give with confidence.</h2><p>Your Zakat is recorded as a restricted giving type and never mixed with ordinary Sadaqah. Eligible campaigns are reviewed against versioned Shariah policy.</p><ul><li>2.5% calculation with configurable nisab</li><li>Separate ledger and distribution reporting</li><li>Calculation stays private on this device</li></ul></div>
        <div className="calculator">
          <div className="calculator-top"><div><span>Current nisab</span><b>KSh 650,000</b></div><span className="verified-pill">Policy reviewed</span></div>
          <div className="calc-grid">
            {[['cash','Cash & savings'],['gold','Gold & silver value'],['investments','Investments'],['business','Business assets'],['receivables','Money owed to you'],['liabilities','Short-term liabilities']].map(([key,label]) => <label key={key}><span>{label}</span><div><small>KSh</small><input inputMode="numeric" value={zakat[key as keyof typeof zakat]} onChange={event => setZakat({...zakat, [key]: event.target.value.replace(/\D/g,'')})} placeholder="0" /></div></label>)}
          </div>
          <div className="zakat-total"><span>Estimated Zakat due <small>{zakatNet < nisab ? 'Below nisab threshold' : '2.5% of eligible net assets'}</small></span><strong>KSh {Math.round(zakatDue).toLocaleString()}</strong></div>
          <button className="button full" disabled={!zakatDue} onClick={() => { startDonation(null, 'Zakat'); setAmount(String(Math.round(zakatDue))); }}>Give my Zakat <span>↗</span></button>
          <p className="fine-print">This calculator is an estimate, not a personal religious ruling.</p>
        </div>
      </section>

      <section className="impact-section" id="impact">
        <div className="impact-intro"><p className="eyebrow">Your giving, accounted for</p><h2>See exactly what happened next.</h2><p>The donation button is only the beginning. Every verified update, approval, disbursement and outcome builds a traceable impact record.</p><button className="text-link button-link" onClick={() => setDashboardOpen(true)}>Open your Impact Center <span>↗</span></button></div>
        <div className="impact-timeline">
          <div className="timeline-head"><div><span>PROJECT TRACE</span><b>Al-Huda Water Project · WTR-284</b></div><span className="complete">Completed</span></div>
          {[['14 Jan','You donated KSh 5,000','Payment confirmed and receipt issued.'],['28 Jan','Campaign fully funded','Restricted funds locked to WTR-284.'],['12 Feb','Borehole drilling approved','Maker, checker and approver controls passed.'],['05 Mar','Water test completed','Independent results uploaded and reviewed.'],['18 Mar','Project impact verified','Now serving 340 people in Garissa.']].map((item,index) => <div className="timeline-item" key={item[0]}><div className={`timeline-dot ${index === 4 ? 'last' : ''}`}>{index === 4 ? '✓' : ''}</div><time>{item[0]}</time><div><b>{item[1]}</b><p>{item[2]}</p></div></div>)}
          <div className="evidence-row"><span>4 photos</span><span>2 receipts</span><span>Water test report</span><button onClick={() => setSelected(campaigns[0])}>View evidence →</button></div>
        </div>
      </section>

      <section className="stats-band">
        {[['KSh 246,820,450','donated'],['18,742','families supported'],['2.4M','meals provided'],['189','water projects'],['4,280','orphans supported']].map(([value,label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
      </section>

      <section className="updates-section">
        <div className="section-heading"><div><p className="eyebrow">Latest verified updates</p><h2>Proof of progress, not promises.</h2></div><button className="text-link button-link" onClick={() => setDashboardOpen(true)}>See all your updates <span>↗</span></button></div>
        <div className="updates-grid">
          {[
            { campaign: campaigns[0], date: '18 Mar 2026', label: 'Impact verified', title: 'Clean water is now flowing for 340 people', body: 'Independent water testing passed and the final contractor payment was reconciled.' },
            { campaign: campaigns[2], date: '12 Mar 2026', label: 'Distribution verified', title: '250 food packs reached Mombasa households', body: 'Recipient counts, delivery photos and signed distribution records were reviewed.' },
            { campaign: campaigns[1], date: '06 Mar 2026', label: 'Milestone reached', title: 'Al-Rahmah mosque roofing is complete', body: 'The next approved release covers electrical work and the accessible water facility.' },
          ].map(update => <article className="update-card" key={update.title}>
            <button className="update-image" onClick={() => setSelected(update.campaign)} aria-label={`View ${update.title}`}><img src={update.campaign.image} alt=""/><span>{update.label}</span></button>
            <div><time>{update.date} · {update.campaign.id}</time><h3>{update.title}</h3><p>{update.body}</p><button onClick={() => setSelected(update.campaign)}>View evidence <span>↗</span></button></div>
          </article>)}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading centered"><div><p className="eyebrow">A clearer way to give</p><h2>Discover. Give. Track. See impact.</h2></div></div>
        <div className="steps-grid">
          {[['01','Discover verified need','Search by cause, location, giving type and verification level.'],['02','Choose your intention','Keep Zakat, Sadaqah, Sadaqah Jariyah and Waqf clearly separated.'],['03','Give securely','Use M-PESA or card, anonymously or as a recurring gift.'],['04','Follow the outcome','Receive receipts, disbursement updates and verified completion evidence.']].map(step => <article key={step[0]}><span>{step[0]}</span><h3>{step[1]}</h3><p>{step[2]}</p></article>)}
        </div>
      </section>

      <section className="donor-promise">
        <div className="promise-mark">A</div>
        <div><p className="eyebrow light">The Amanah promise</p><h2>Your intention stays clear. Your gift stays accountable.</h2></div>
        <div className="promise-points"><span><b>01</b>Giving type recorded</span><span><b>02</b>Funds restricted correctly</span><span><b>03</b>Every release approved</span><span><b>04</b>Impact evidence returned</span></div>
      </section>

      <section className="platform-preview">
        <div className="platform-preview-copy"><p className="eyebrow">One mission. Six coordinated products.</p><h2>The complete giving ecosystem.</h2><p>Donors see impact. Beneficiaries request help privately. Organizations deliver transparently. Admin, finance and Shariah teams protect every decision behind the scenes.</p><button className="button" onClick={() => setPlatformOpen(true)}>Explore the full platform ↗</button></div>
        <div className="platform-preview-grid">{[['♡','Donor','Give, plan and trace'],['⌂','Beneficiary','Request help privately'],['◇','Organization','Deliver with evidence'],['◎','Admin','Verify and protect'],['≡','Finance','Reconcile every fund'],['✦','Shariah','Govern with clarity']].map(x => <button key={x[1]} onClick={() => setPlatformOpen(true)}><i>{x[0]}</i><span><b>{x[1]}</b><small>{x[2]}</small></span><em>→</em></button>)}</div>
      </section>

      <section className="organizations">
        <div><p className="eyebrow light">Verified organizations</p><h2>Trusted locally.<br/>Accountable publicly.</h2><p>Every organization profile clearly shows what was checked, who is responsible, and the latest verified impact.</p><button className="outline-button" onClick={() => setToast('Organization directory opened')}>Explore organizations →</button></div>
        <div className="org-card"><span className="org-logo">AR</span><div><p className="verified">● Organization verified</p><h3>Al-Rahmah Community Trust</h3><p>Nairobi · 12 active projects · 94% reporting score</p></div><span className="score">A+</span></div>
      </section>

      <footer><div className="footer-brand"><a className="brand inverse" href="#top"><span className="brand-mark">A</span><span>AMANAH<small>GIVING</small></span></a><p>Transparent, secure and Shariah-aware digital giving.</p></div><div><b>Give</b><a href="#causes">Urgent appeals</a><a href="#zakat">Zakat Center</a><a href="#impact">Impact Center</a></div><div><b>Platform</b><a href="#how">How it works</a><button onClick={() => setPlatformOpen(true)}>Request assistance</button><button onClick={() => setPlatformOpen(true)}>For organizations</button></div><div><b>Trust</b><button onClick={() => setPlatformOpen(true)}>Verification</button><button onClick={() => setPlatformOpen(true)}>Privacy</button><button onClick={() => setPlatformOpen(true)}>Shariah governance</button></div><div className="footer-cta"><p>Ready to make an impact?</p><button className="button sand" onClick={() => startDonation()}>Give now ↗</button></div></footer>
      <div className="footer-bottom"><span>© 2026 Amanah Giving · Kenya</span><span>English · Kiswahili · Secure giving</span></div>

      <nav className="mobile-nav" aria-label="Mobile navigation"><a href="#top"><span>⌂</span>Home</a><a href="#causes"><span>⌕</span>Explore</a><button className="mobile-give" onClick={() => startDonation()}><span>+</span>Give</button><a href="#impact"><span>◎</span>Impact</a><button onClick={() => setDashboardOpen(true)}><span>○</span>Account</button></nav>

      {searchOpen && <div className="overlay" role="dialog" aria-modal="true" aria-label="Search verified campaigns"><div className="search-panel"><button className="close" aria-label="Close dialog" onClick={() => setSearchOpen(false)}>×</button><p className="eyebrow">Search Amanah Giving</p><h2>Find a cause close to your heart.</h2><div className="search-input"><span>⌕</span><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Try ‘orphan Nairobi’ or ‘water Garissa’" /></div><div className="filter-row">{['All','Zakat','Food','Orphans','Water','Mosque'].map(item => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="search-results">{filteredCampaigns.map(campaign => <button key={campaign.id} onClick={() => { setSearchOpen(false); setSelected(campaign); }}><img src={campaign.image} alt=""/><span><b>{campaign.title}</b><small>{campaign.meta} · {campaign.zakat ? 'Zakat eligible' : campaign.category}</small></span><em>{Math.round(campaign.raised / campaign.goal * 100)}%</em></button>)}</div></div></div>}

      {selected && <div className="overlay" role="dialog" aria-modal="true" aria-label="Campaign details"><div className="detail-panel"><button className="close" aria-label="Close dialog" onClick={() => setSelected(null)}>×</button><div className="detail-media"><img className="detail-hero" src={selected.image} alt=""/><div className="detail-media-caption"><span>LEVEL 3 VERIFIED</span><b>Field need and budget reviewed</b><button onClick={() => setToast('Verification record opened')}>See verification record ↗</button></div></div><div className="detail-content"><p className="verified">● Campaign verified · {selected.id}</p><h2>{selected.title}</h2><p>{selected.story}</p><div className="detail-facts"><span><b>{money(selected.raised)}</b>raised</span><span><b>{selected.donors.toLocaleString()}</b>donors</span><span><b>{selected.days}</b>days left</span></div><div className="budget"><h3>Transparent budget</h3><div><span>Project delivery</span><b>82%</b></div><div><span>Verification & reporting</span><b>8%</b></div><div><span>Payment and operations</span><b>10%</b></div></div><div className="disbursement-preview"><div><span>DISBURSEMENT PLAN</span><b>Released only against milestones</b></div><ol><li className="done"><i>✓</i><span><b>Mobilization</b><small>20% · reconciled</small></span></li><li className="active"><i>2</i><span><b>Core delivery</b><small>45% · evidence required</small></span></li><li><i>3</i><span><b>Completion</b><small>25% · pending</small></span></li><li><i>4</i><span><b>Retention</b><small>10% · after impact review</small></span></li></ol></div><div className="verification-box"><b>What we verified</b><p>Responsible organization, supporting documents, field need, budget, payment destination and update schedule.</p></div><div className="detail-assurances"><span>▣ Restricted fund</span><span>◎ Update schedule</span><span>✓ Complaint channel</span></div><button className="button full" onClick={() => { const campaign = selected; setSelected(null); startDonation(campaign); }}>Donate to this campaign ↗</button></div></div></div>}

      {donationStep > 0 && renderDonationModal()}

      {dashboardOpen && <div className="overlay" role="dialog" aria-modal="true" aria-label="My Giving dashboard"><div className="dashboard-panel premium-dashboard"><button className="close" aria-label="Close dialog" onClick={() => setDashboardOpen(false)}>×</button><div className="dashboard-welcome"><div><p className="eyebrow">My Giving</p><h2>Assalamu Alaikum, Amina</h2><span>Safar 1448 · Your private impact record</span></div><button onClick={() => setToast('Annual giving statement prepared')}>▣ Download statement</button></div><div className="dashboard-stats"><div><span>Total given</span><b>KSh 72,450</b><small>Across 4 giving types</small></div><div><span>Projects supported</span><b>24</b><small>8 counties</small></div><div><span>Recurring gifts</span><b>4</b><small>Next gift Friday</small></div><div><span>Verified outcomes</span><b>18</b><small>75% complete</small></div></div><div className="dashboard-layout"><div><h3>Latest impact</h3><div className="dashboard-update"><img src="/water-community.jpg" alt=""/><div><span>IMPACT VERIFIED</span><b>Al-Huda Water Project completed</b><p>Your KSh 5,000 Sadaqah Jariyah now helps serve 340 people.</p><button onClick={() => { setDashboardOpen(false); setSelected(campaigns[0]); }}>View full trace →</button></div></div></div><aside><h3>Giving balance</h3><div className="giving-balance"><div><span>Zakat</span><b>KSh 28,000</b><i style={{width:'39%'}}/></div><div><span>Sadaqah</span><b>KSh 22,450</b><i style={{width:'31%'}}/></div><div><span>Jariyah</span><b>KSh 18,500</b><i style={{width:'25%'}}/></div><div><span>Other</span><b>KSh 3,500</b><i style={{width:'5%'}}/></div></div></aside></div><div className="dashboard-actions"><button onClick={() => { setDashboardOpen(false); setPlannerOpen(true); }}>☾ Manage giving plans <span>4 active</span></button><button onClick={() => setToast('Tax and receipt center opened')}>▣ Receipt center <span>24 receipts</span></button><button onClick={() => { setDashboardOpen(false); setNotificationsOpen(true); }}>◉ Preferences <span>4 channels</span></button></div><h3>Saved causes</h3><p className="muted">{saved.length ? `${saved.length} campaign${saved.length > 1 ? 's' : ''} saved on this device.` : 'Save a campaign to find it here later.'}</p></div></div>}

      {platformOpen && <PlatformConsole onClose={() => setPlatformOpen(false)} onGive={() => { setPlatformOpen(false); startDonation(); }}/>} 
      {plannerOpen && <GivingPlanner onClose={() => setPlannerOpen(false)} onCreate={(plannedAmount,label) => { setPlannerOpen(false); startDonation(null, 'Sadaqah'); setAmount(plannedAmount); setRecurring(true); setSchedule(label); }}/>} 

      {notificationsOpen && <div className="overlay notification-overlay" role="dialog" aria-modal="true" aria-label="Notifications"><div className="notification-panel"><button className="close" aria-label="Close dialog" onClick={() => setNotificationsOpen(false)}>×</button><div className="notification-head"><div><p className="eyebrow">Notification center</p><h2>Peace of mind, delivered.</h2></div><button onClick={() => setToast('All notifications marked as read')}>Mark all read</button></div><div className="notification-tabs"><button className="active">All <span>3</span></button><button>Impact</button><button>Payments</button><button>Plans</button></div><div className="notification-list">{[
        ['impact','Impact verified','Clean water is now flowing in Garissa','Your WTR-284 gift now helps serve 340 people.','2h'],
        ['receipt','Receipt ready','Your Jumu’ah Sadaqah was confirmed','KSh 500 · AMN-948231','Fri'],
        ['plan','Giving plan reminder','Last 10 nights plan begins in 5 days','Review your amount and payment method.','1d'],
        ['security','New sign-in protected','A sign-in from Nairobi was verified','If this was not you, secure your account.','3d'],
      ].map((item,index) => <button key={item[1]} className={index < 3 ? 'unread' : ''} onClick={() => setToast(`${item[1]} opened`)}><i>{item[0] === 'impact' ? '✓' : item[0] === 'receipt' ? '▣' : item[0] === 'plan' ? '☾' : '○'}</i><span><b>{item[1]}</b><strong>{item[2]}</strong><small>{item[3]}</small></span><time>{item[4]}</time></button>)}</div><div className="notification-settings"><span><b>Delivery preferences</b><small>In-app · Email · SMS · WhatsApp</small></span><button onClick={() => { setNotificationsOpen(false); setPlatformOpen(true); }}>Manage →</button></div></div></div>}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
      <a className="back-to-top" href="#top" aria-label="Back to top">↑</a>
    </main>
  );

  function renderDonationModal() {
    const numericAmount = Number(amount) || 0;
    const fee = coverFees ? Math.ceil(numericAmount * 0.018) : 0;
    const tip = Math.ceil(numericAmount * platformTip / 100);
    return <div className="overlay" role="dialog" aria-modal="true" aria-label="Donation checkout"><div className="donation-panel"><button className="close" aria-label="Close dialog" onClick={() => { setDonationStep(0); setReceipt(null); setDonationCampaign(null); }}>×</button>{donationStep < 4 && <><div className="checkout-heading"><p className="eyebrow">Secure donation</p><div className="checkout-assurance"><span>▣ Encrypted</span><span>✓ Auditable</span><span>◉ Private</span></div></div><div className="stepper"><span className={donationStep >= 1 ? 'active' : ''}>1</span><i/><span className={donationStep >= 2 ? 'active' : ''}>2</span><i/><span className={donationStep >= 3 ? 'active' : ''}>3</span></div></>}
      {donationStep === 1 && <div className="donation-step"><h2>What is your intention?</h2><p>Every donation keeps an immutable giving type for correct accounting.</p><div className="option-grid">{['Sadaqah','Zakat','Sadaqah Jariyah','Waqf','Fidyah / Kaffarah','General charity'].map(item => <button className={intention === item ? 'selected' : ''} key={item} onClick={() => setIntention(item)}><span>{item === 'Zakat' ? '✦' : item === 'Sadaqah Jariyah' ? '∞' : '○'}</span><b>{item}</b><small>{item === 'Zakat' ? 'Restricted fund' : item === 'Sadaqah Jariyah' ? 'Ongoing benefit' : 'Verified giving'}</small></button>)}</div><button className="button full" onClick={() => setDonationStep(2)}>Continue to amount →</button></div>}
      {donationStep === 2 && <div className="donation-step"><button className="back" onClick={() => setDonationStep(1)}>← Back</button><h2>Shape your gift</h2>{donationCampaign && <div className="donation-campaign"><img src={donationCampaign.image} alt=""/><span><small>Giving to</small><b>{donationCampaign.title}</b></span></div>}<div className="amount-grid">{['500','1000','2500','5000'].map(value => <button className={amount === value ? 'selected' : ''} key={value} onClick={() => setAmount(value)}>KSh {Number(value).toLocaleString()}</button>)}</div><label className="custom-amount"><span>Custom amount</span><div><small>KSh</small><input inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value.replace(/\D/g,''))}/></div></label><label className="check-row"><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)}/><span><b>Give anonymously</b><small>Your identity stays private publicly.</small></span></label><label className="check-row"><input type="checkbox" checked={onBehalf} onChange={event => setOnBehalf(event.target.checked)}/><span><b>Give on behalf of someone</b><small>Add a private dedication to the receipt.</small></span></label>{onBehalf && <label className="dedication-field"><span>Dedication or name</span><input value={dedication} onChange={event => setDedication(event.target.value.slice(0,80))} placeholder="In honour or memory of…"/></label>}<label className="check-row"><input type="checkbox" checked={recurring} onChange={event => setRecurring(event.target.checked)}/><span><b>Make this recurring</b><small>Pause or cancel any time from My Giving.</small></span></label>{recurring && <label className="schedule-field"><span>Giving schedule</span><select value={schedule} onChange={event => setSchedule(event.target.value)}><option>Daily</option><option>Every Jumu’ah</option><option>Monthly</option><option>Last 10 nights</option></select></label>}<button className="button full" disabled={!numericAmount} onClick={() => setDonationStep(3)}>Continue to payment →</button></div>}
      {donationStep === 3 && <form className="donation-step" onSubmit={finishDonation}><button type="button" className="back" onClick={() => setDonationStep(2)}>← Back</button><h2>Complete your gift</h2><div className="payment-tabs three-tabs"><button type="button" className={payment === 'M-PESA' ? 'active' : ''} onClick={() => setPayment('M-PESA')}>M-PESA</button><button type="button" className={payment === 'Card' ? 'active' : ''} onClick={() => setPayment('Card')}>Card</button><button type="button" className={payment === 'Bank' ? 'active' : ''} onClick={() => setPayment('Bank')}>Bank</button></div>{payment === 'M-PESA' ? <label className="field"><span>M-PESA phone number</span><div><small>+254</small><input required value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g,'').slice(0,9))} placeholder="712 345 678"/></div><em>An STK Push will be sent to this number.</em></label> : payment === 'Card' ? <><label className="field"><span>Card number</span><input required placeholder="1234 5678 9012 3456"/></label><div className="two-fields"><label className="field"><span>Expiry</span><input required placeholder="MM / YY"/></label><label className="field"><span>CVC</span><input required placeholder="123"/></label></div></> : <div className="bank-instructions"><span>AMANAH CLIENT ACCOUNT</span><b>Reference AMN-{Date.now().toString().slice(-6)}</b><p>Bank details appear after you reserve this gift. Funds are only posted after statement reconciliation.</p></div>}<label className="check-row"><input type="checkbox" checked={coverFees} onChange={event => setCoverFees(event.target.checked)}/><span><b>Cover payment costs</b><small>Add KSh {Math.ceil(numericAmount * 0.018).toLocaleString()} so the cause receives your full gift.</small></span></label><div className="tip-control"><div><span><b>Support the Amanah platform</b><small>Optional and always shown separately.</small></span><strong>{platformTip}%</strong></div><input type="range" min="0" max="10" step="2" value={platformTip} onChange={event => setPlatformTip(Number(event.target.value))}/><div><button type="button" onClick={() => setPlatformTip(0)}>No tip</button><button type="button" onClick={() => setPlatformTip(5)}>5%</button><button type="button" onClick={() => setPlatformTip(10)}>10%</button></div></div><div className="payment-summary"><span>Your {intention}{recurring ? ` · ${schedule}` : ''}</span><b>KSh {(numericAmount + fee + tip).toLocaleString()}</b><small>Gift {numericAmount.toLocaleString()} + costs {fee.toLocaleString()} + optional support {tip.toLocaleString()}</small></div><button className="button full" type="submit">{payment === 'M-PESA' ? 'Send M-PESA prompt' : payment === 'Bank' ? 'Reserve bank transfer' : 'Give securely'} →</button><p className="secure-note">▣ Payment confirmation is verified before a donation is recorded.</p></form>}
      {donationStep === 4 && receipt && <div className="receipt"><span className="receipt-check">✓</span><p className="eyebrow">Donation confirmed</p><h2>JazakAllahu Khayran</h2><p>Your gift has been received and restricted to its stated intention.</p><div className="receipt-card"><span>AMOUNT<b>KSh {numericAmount.toLocaleString()}</b></span><span>TYPE<b>{intention}</b></span><span>PROJECT<b>{donationCampaign?.title || 'Most-needed verified cause'}</b></span><span>TRANSACTION<b>{receipt.transaction}</b></span><span>DATE<b>{receipt.date}</b></span></div><button className="button full" onClick={() => { setDonationStep(0); setReceipt(null); setDonationCampaign(null); setToast('Receipt saved to My Giving'); }}>View my impact →</button><button className="download-receipt" onClick={() => window.print()}>Download receipt</button></div>}</div></div>;
  }
}
