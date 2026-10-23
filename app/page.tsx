'use client';

import Icon from './Icon';
import SiteHeader from './SiteHeader';
import AmanahLogo from './AmanahLogo';
import NotificationCenter from './NotificationCenter';
import MyGiving from './MyGiving';
import MobileNavigation from './MobileNavigation';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import PlatformConsole, { type Portal } from './PlatformConsole';
import GivingPlanner from './GivingPlanner';
import Image from 'next/image';
import { DRAFT_KEY, readDrafts, downloadText, draftText, type GivingDraft } from './givingDrafts';

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
  { id: 'HLT-728', title: 'Emergency care for vulnerable families', category: 'Health', meta: 'Kilifi, Kenya', raised: 1480000, goal: 2200000, donors: 531, days: 9, image: '/healthcare-community.jpg', badge: 'Urgent care', zakat: true, story: 'Help verified households access urgent consultations, essential medicine and safe transport to partner health facilities.' },
  { id: 'EDU-390', title: 'Equip a community Qur’an learning centre', category: 'Education', meta: 'Nakuru, Kenya', raised: 925000, goal: 1600000, donors: 318, days: 19, image: '/quran-learning.jpg', badge: 'Sadaqah Jariyah', zakat: false, story: 'Provide Qur’ans, desks, lighting and accessible learning materials for children and adult students in the local community.' },
];

const completedWater: Campaign = { ...campaigns[0], id: 'WTR-183', title: 'Al-Huda water project in Garissa', raised: 5000000, goal: 5000000, days: 0, badge: 'Completed', story: 'This example completed project serves 340 people. The timeline illustrates how a completed delivery is recorded separately from an active appeal.' };

const completedFood: Campaign = { ...campaigns[2], id: 'FOD-398', title: 'Food distribution to 250 Mombasa households', raised: 1250000, goal: 1250000, days: 0, badge: 'Completed', story: 'This example completed distribution reached 250 households. Delivery counts and distribution records illustrate a closed delivery, separate from the current appeal.' };

const money = (value: number) => value >= 1000000 ? `KSh ${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}M` : `KSh ${Math.round(value / 1000)}K`;

const copy = {
  en: { causes: 'Causes', zakat: 'Zakat', impact: 'Impact', how: 'How it works', sign: 'My giving', give: 'Give now', eyebrow: 'Give with amanah. See the impact.', titleA: 'Give for the sake of Allah.', titleB: 'Change a life.', lead: 'Verified Islamic giving with transparent impact, from your donation to delivery.' },
  sw: { causes: 'Miradi', zakat: 'Zaka', impact: 'Matokeo', how: 'Jinsi inavyofanya kazi', sign: 'Sadaka zangu', give: 'Toa sasa', eyebrow: 'Toa kwa uaminifu. Ona matokeo.', titleA: 'Toa kwa ajili ya Allah.', titleB: 'Badilisha maisha.', lead: 'Sadaka ya Kiislamu iliyothibitishwa, yenye uwazi kutoka mchango hadi matokeo.' },
  ar: { causes: 'المشاريع', zakat: 'الزكاة', impact: 'الأثر', how: 'كيف تعمل', sign: 'عطائي', give: 'تبرع الآن', eyebrow: 'أعطِ بأمانة. وشاهد الأثر.', titleA: 'أعطِ ابتغاء وجه الله.', titleB: 'غيّر حياة.', lead: 'عطاء إسلامي موثّق وشفاف، من تبرعك حتى وصول الأثر.' },
};

export default function Home() {
  const language = 'en' as const;
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [drafts, setDrafts] = useState<GivingDraft[]>([]);
  const [draft, setDraft] = useState<GivingDraft | null>(null);
  const [draftError, setDraftError] = useState('');
  const [draftSaving, setDraftSaving] = useState(false);
  const [planCause, setPlanCause] = useState('Where most needed');
  const [planReminders, setPlanReminders] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
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
  const [anonymous, setAnonymous] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [coverFees, setCoverFees] = useState(true);
  const [toast, setToast] = useState('');
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformPortal, setPlatformPortal] = useState<Portal>('donor');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>(['security']);
  const [dedication, setDedication] = useState('');
  const [onBehalf, setOnBehalf] = useState(false);
  const [schedule, setSchedule] = useState('Monthly');
  const [platformTip, setPlatformTip] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [zakat, setZakat] = useState({ cash: '', gold: '', investments: '', business: '', receivables: '', liabilities: '' });

  const t = copy[language];
  const dialogOpen = languagesOpen || searchOpen || !!selected || donationStep > 0 || dashboardOpen || platformOpen || plannerOpen || notificationsOpen;
  const modalKey = languagesOpen ? 'languages' : searchOpen ? 'search' : selected ? `campaign-${selected.id}` : donationStep ? `giving-${donationStep}` : dashboardOpen ? 'dashboard' : platformOpen ? 'platform' : plannerOpen ? 'planner' : notificationsOpen ? 'notifications' : '';

  useEffect(() => {
    if (!dialogOpen) return;
    const background = Array.from(document.getElementById('main-content')?.children || []).filter((child): child is HTMLElement => child instanceof HTMLElement && !child.matches('[aria-modal=true], .toast'));
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
      background.forEach((element,index) => { element.inert = previousInert[index]; });
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [dialogOpen, modalKey]);
  const filteredCampaigns = useMemo(() => campaigns.filter(campaign => {
    const matchesFilter = filter === 'All' || campaign.category === filter || (filter === 'Zakat' && campaign.zakat);
    const words = `${campaign.title} ${campaign.meta} ${campaign.category}`.toLowerCase();
    return matchesFilter && query.trim().toLowerCase().split(/\s+/).every(word => words.includes(word));
  }), [filter, query]);

  const zakatNet = Object.entries(zakat).reduce((total, [key, value]) => total + (key === 'liabilities' ? -1 : 1) * (Number(value) || 0), 0);
  const nisab = 650000;
  const zakatDue = zakatNet >= nisab ? zakatNet * 0.025 : 0;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDrafts(readDrafts());
      try {
        const stored: unknown = JSON.parse(localStorage.getItem('amanah-saved') || '[]');
        if (Array.isArray(stored)) setSaved(stored.filter((id): id is string => typeof id === 'string' && campaigns.some(c => c.id === id)));
      } catch { /* Storage may be unavailable; the page still works for this session. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [language]);

  useEffect(() => {
    const onScroll = () => setScrollProgress(Math.min(100, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight) * 100));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); setSelected(null); setDashboardOpen(false); setPlatformOpen(false); setPlannerOpen(false); setNotificationsOpen(false); setLanguagesOpen(false); setDonationStep(0); return; }
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
    try { localStorage.setItem('amanah-saved', JSON.stringify(next)); setToast(next.includes(id) ? 'Campaign saved to My Giving' : 'Campaign removed'); }
    catch { setToast('Updated for this session. Device storage is unavailable.'); }
  };

  function startDonation(campaign?: Campaign | null, preset?: string) {
    setDonationCampaign(campaign || null);
    setDonationStep(1);
    setDraft(null); setDraftError('');
    setIntention(preset || (campaign?.zakat ? 'Zakat' : 'Sadaqah'));
    setAmount('1000');
    setAnonymous(false); setRecurring(false); setCoverFees(true); setPayment('M-PESA');
    setPlanCause('Where most needed'); setPlanReminders(false);
    setDedication('');
    setOnBehalf(false);
    setSchedule('Monthly');
    setPlatformTip(0);
  }

  const finishDonation = async (event: FormEvent) => {
    event.preventDefault();
    if (draftSaving) return;
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value < 1 || value > 999999999) { setDraftError('Enter a whole-shilling amount between KSh 1 and KSh 999,999,999.'); return; }
    setDraftSaving(true); setDraftError('');
    try {
      const entry: GivingDraft = { id: `DRAFT-${crypto.randomUUID().slice(0,8).toUpperCase()}`, createdAt: new Date().toISOString(), amount: value, intention, campaign: donationCampaign?.title || planCause, payment, recurring, schedule, cause: planCause, reminders: planReminders, anonymous, dedication: onBehalf ? dedication : '', total: value + (coverFees ? Math.ceil(value * .018) : 0) + Math.ceil(value * platformTip / 100) };
      const next = [entry, ...readDrafts()].slice(0,100);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      setDrafts(next); setDraft(entry); setDonationStep(4);
    } catch { setDraftError('Your draft could not be saved on this device. Enable browser storage and try again. No payment was made.'); }
    finally { setDraftSaving(false); }
  };

  return (
    <main id="main-content">
      <a className="skip-link" href="#top">Skip to main content</a>
      <div className="scroll-progress" aria-hidden="true"><span style={{width:`${scrollProgress}%`}}/></div>
      <div className="trustbar refined-trustbar" role="note" aria-label="Giving safeguards">
        <div className="trustbar-inner">
          <span className="trustbar-item"><Icon name="shield" /><span>Verified campaigns</span></span>
          <span className="trustbar-separator" aria-hidden="true" />
          <span className="trustbar-item trustbar-primary"><Icon name="wallet" /><span>Zakat funds kept separate</span></span>
          <span className="trustbar-separator" aria-hidden="true" />
          <span className="trustbar-item"><Icon name="phone" /><span>M-PESA ready</span></span>
        </div>
      </div>
      <SiteHeader labels={t} language={language} unreadCount={['impact', 'receipt', 'plan', 'security'].filter(id => !readNotifications.includes(id)).length} onLanguage={() => setLanguagesOpen(true)} onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen(true)} onAccount={() => setDashboardOpen(true)} onGive={() => startDonation()} onPlatform={() => setPlatformOpen(true)}/>

      <p className="site-preview-note"><Icon name="shield"/><span>Preview experience · Campaigns and impact figures are illustrative. Prepare giving drafts; payments are not connected.</span></p>
      <section className="hero refined-hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 id="hero-title">{t.titleA} <em>{t.titleB}</em></h1>
          <p className="hero-lead">{t.lead}</p>
          <div className="hero-actions"><a className="text-link" href="#causes">Explore verified causes <span><Icon name="↓"/></span></a></div>
          <div className="hero-proof" aria-label="Amanah Giving at a glance"><div><b>4.9/5</b><small>donor trust</small></div><div><b>218</b><small>active campaigns</small></div><div><b>KSh 246M+</b><small>verified impact</small></div></div>
        </div>
        <div className="hero-visual">
          <Image src="/water-community.jpg" alt="Children gathering at a rural community water well" width={1400} height={1200} priority sizes="(max-width: 900px) 100vw, 50vw" />
          <div className="impact-card"><div className="hero-impact-label"><Icon name="shield"/><b>Impact verified</b></div><p>Garissa water project now serves 340 people.</p><small>Evidence reviewed 2 days ago</small></div>
          <div className="live-giving"><span className="live-pulse"/><b>38 donors</b> gave in the last hour</div>
          <div className="hero-caption"><span>WTR-183 · SADAQAH JARIYAH</span><p>From your giving to safe, flowing water.</p><button onClick={() => { setEvidenceOpen(true); setSelected(completedWater); }}>Trace this project <Icon name="→"/></button></div>
        </div>
      </section>

      <section className="cause-strip refined-causes" aria-label="Popular causes">
        {[['Zakat','giving'],['Food','◌'],['Orphans','users'],['Water','≈'],['Mosque','bank'],["Qur'ans",'book']].map(([cause, icon]) => <button key={cause} onClick={() => { setFilter(cause === "Qur'ans" ? 'Education' : cause); setQuery(''); document.querySelector('#causes')?.scrollIntoView(); }}><span className="cause-icon"><Icon name={icon}/></span><span className="cause-label">{cause === 'Food' ? 'Feed a family' : cause === 'Orphans' ? 'Sponsor an orphan' : cause === 'Water' ? 'Clean water' : cause === 'Mosque' ? 'Build a mosque' : cause}</span></button>)}
      </section>

      <section className="seasonal-giving refined-seasonal" aria-labelledby="seasonal-title">
        <div className="seasonal-heading"><p className="eyebrow">Give in every season</p><h2 id="seasonal-title">Timely worship, thoughtfully prepared.</h2><p>Create plans for sacred days and recurring acts of generosity—without losing oversight or intention.</p><button className="text-link button-link" onClick={() => setPlannerOpen(true)}>Build my giving plan <span><Icon name="↗"/></span></button></div>
        <div className="seasonal-track">{[
          ['NOW','Jumu’ah giving','Every Friday','A small, consistent Sadaqah can become a lasting rhythm.','Create weekly plan'],
          ['RAMADAN','Last 10 nights','Nightly giving','Schedule across the final nights so no opportunity is missed.','Prepare Ramadan plan'],
          ['DHUL HIJJAH','Qurbani','Verified distribution','Reserve ahead and follow verified livestock and distribution evidence.','Plan Qurbani'],
          ['ANY TIME','Fidyah & Kaffarah','Guided calculation','Understand the category, choose a verified program, and retain a receipt.','Open guided flow'],
        ].map((item,index) => <article key={item[1]} style={{'--delay':`${index * 90}ms`} as React.CSSProperties}><div className="season-card-top"><div className="season-icon"><Icon name={['calendar','☾','gift','giving'][index]}/></div><span>{item[0]}</span></div><h3>{item[1]}</h3><b>{item[2]}</b><p>{item[3]}</p><button onClick={() => setPlannerOpen(true)}>{item[4]} <em><Icon name="↗"/></em></button></article>)}</div>
      </section>

      <section className="section refined-opportunities" id="causes" aria-labelledby="causes-title">
        <div className="section-heading"><div><p className="eyebrow">Verified opportunities</p><h2 id="causes-title">Give where it matters most</h2></div><button className="text-link button-link" onClick={() => setSearchOpen(true)}><Icon name="search"/>Search all causes</button></div>
        <div className="filter-row" aria-label="Filter verified causes">{['All','Zakat','Food','Orphans','Water','Mosque','Health','Education'].map(item => <button className={filter === item ? 'active' : ''} aria-pressed={filter === item} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="campaign-grid">
          {filteredCampaigns.map(campaign => {
            const progress = Math.round(campaign.raised / campaign.goal * 100);
            return <article className="campaign-card" key={campaign.id} aria-labelledby={`title-${campaign.id}`}>
              <div className="campaign-image"><Image src={campaign.image} alt="" width={900} height={600} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" style={{ objectPosition: campaign.id === 'EDU-390' ? '50% 34%' : 'center' }} /><span className="badge">{campaign.badge}</span><button className={`save ${saved.includes(campaign.id) ? 'saved' : ''}`} aria-pressed={saved.includes(campaign.id)} onClick={() => toggleSaved(campaign.id)} aria-label={`${saved.includes(campaign.id) ? 'Remove' : 'Save'} ${campaign.title}`}>{saved.includes(campaign.id) ? <Icon name="♥"/> : <Icon name="♡"/>}</button>
                <div className="campaign-image-content">
                <div className="campaign-meta-row"><p className="verified"><Icon name="shield"/><span>Campaign verified <span className="campaign-code">· {campaign.id}</span></span></p><span className={`campaign-deadline ${campaign.days <= 12 ? 'deadline-soon' : ''}`}><Icon name="◷"/>{campaign.days} days left</span></div>
                <h3 id={`title-${campaign.id}`}>{campaign.title}</h3>
                <p className="muted campaign-location"><span>{campaign.meta}</span><span aria-hidden="true">·</span><span>{campaign.donors.toLocaleString()} donors</span>{campaign.zakat && campaign.badge !== 'Zakat eligible' && <span className="campaign-eligibility">Zakat eligible</span>}</p>
                </div>
              </div>
              <div className="campaign-body">
                <div className="campaign-funding"><div className="money-row"><div className="funding-amount"><strong>{money(campaign.raised)}</strong><small>raised of {money(campaign.goal)}</small></div><b>{progress}% funded</b></div><div className="progress" role="progressbar" aria-label={`Funding for ${campaign.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, progress)} aria-valuetext={`${campaign.raised.toLocaleString()} Kenyan shillings raised of ${campaign.goal.toLocaleString()}`}><span style={{width: `${Math.min(100, progress)}%`}} /></div></div>
                <div className="card-footer"><button onClick={() => { setEvidenceOpen(false); setSelected(campaign); }} aria-label={`View details: ${campaign.title}`}>View details<Icon name="→"/></button><button className="donate-mini" onClick={() => startDonation(campaign)} aria-label={`Donate to ${campaign.title}`}>Donate<Icon name="↗"/></button></div>
              </div>
            </article>;
          })}
        </div>
        {!filteredCampaigns.length && <div className="empty-state" role="status">No verified campaigns match this search yet.</div>}
      </section>

      <section className="zakat-section refined-zakat" id="zakat" aria-labelledby="zakat-title">
        <div className="zakat-copy"><p className="eyebrow light">Dedicated Zakat Center</p><h2 id="zakat-title">Calculate with clarity.<br/>Give with confidence.</h2><p>Your Zakat is recorded as a restricted giving type and never mixed with ordinary Sadaqah. Eligible campaigns are reviewed against versioned Shariah policy.</p><ul><li><Icon name="giving"/>2.5% calculation using the current nisab</li><li><Icon name="wallet"/>Separate ledger and distribution reporting</li><li><Icon name="shield"/>Calculation stays private on this device</li></ul></div>
        <div className="calculator">
          <div className="calculator-top"><div><span>Current nisab</span><b>KSh 650,000</b></div><span className="verified-pill"><Icon name="shield"/>Policy reviewed</span></div>
          <div className="calc-grid">
            {[['cash','Cash & savings'],['gold','Gold & silver value'],['investments','Investments'],['business','Business assets'],['receivables','Money owed to you'],['liabilities','Short-term liabilities']].map(([key,label]) => <label key={key}><span>{label}</span><div><small aria-hidden="true">KSh</small><input inputMode="numeric" aria-label={`${label} in Kenyan shillings`} autoComplete="off" value={zakat[key as keyof typeof zakat]} onChange={event => setZakat({...zakat, [key]: event.target.value.replace(/\D/g,'').slice(0,12)})} placeholder="0" /></div></label>)}
          </div>
          <div className="zakat-total" role="status" aria-live="polite" aria-atomic="true"><span>Estimated Zakat due <small>{zakatNet < nisab ? 'Below nisab threshold' : '2.5% of eligible net assets'}</small></span><strong>KSh {Math.round(zakatDue).toLocaleString('en-KE')}</strong></div>
          <button className="button full" disabled={!zakatDue} onClick={() => { startDonation(null, 'Zakat'); setAmount(String(Math.round(zakatDue))); }}>Give my Zakat <span><Icon name="↗"/></span></button>
          <p className="fine-print">This calculator is an estimate, not a personal religious ruling.</p>
        </div>
      </section>

      <section className="impact-section refined-impact" id="impact" aria-labelledby="impact-title">
        <div className="impact-intro"><p className="eyebrow">Your giving, accounted for</p><h2 id="impact-title">See exactly what happened next.</h2><p>The donation button is only the beginning. Every verified update, approval, disbursement and outcome builds a traceable impact record.</p><button className="text-link button-link" onClick={() => setDashboardOpen(true)}>Open your Impact Center <span><Icon name="↗"/></span></button></div>
        <div className="impact-timeline">
          <div className="timeline-head"><div><span>PROJECT TRACE</span><h3>Al-Huda Water Project</h3><small>WTR-183</small></div><span className="complete"><Icon name="✓"/>Completed</span></div>
          <ol className="impact-stages">{[['14 Jan','You donated KSh 5,000','Payment confirmed and receipt issued.','2026-01-14'],['28 Jan','Campaign fully funded','Restricted funds locked to WTR-183.','2026-01-28'],['12 Feb','Borehole drilling approved','Maker, checker and approver controls passed.','2026-02-12'],['05 Mar','Water test completed','Independent results uploaded and reviewed.','2026-03-05'],['18 Mar','Project impact verified','Now serving 340 people in Garissa.','2026-03-18']].map((item,index) => <li className={`timeline-item ${index === 4 ? 'final-stage' : ''}`} key={item[0]}><span className={`timeline-dot ${index === 4 ? 'last' : ''}`} aria-hidden="true"><Icon name="✓"/></span><time dateTime={item[3]}>{item[0]}</time><div><b>{item[1]}</b><p>{item[2]}</p></div></li>)}</ol>
          <div className="evidence-row"><div className="evidence-files"><span>4 photos</span><span>2 receipts</span><span>Water test report</span></div><button onClick={() => { setEvidenceOpen(true); setSelected(completedWater); }}>View evidence <Icon name="→"/></button></div>
        </div>
      </section>

      <section className="stats-band refined-impact-stats" aria-label="Giving impact in numbers">
        {[['KSh 246,820,450','donated'],['18,742','families supported'],['2.4M','meals provided'],['189','water projects'],['4,280','orphans supported']].map(([value,label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
      </section>

      <section className="updates-section refined-updates" aria-labelledby="updates-title">
        <div className="section-heading"><div><p className="eyebrow">Latest verified updates</p><h2 id="updates-title">Proof of progress, not promises.</h2></div><button className="text-link button-link" onClick={() => setDashboardOpen(true)}>See all your updates <span><Icon name="↗"/></span></button></div>
        <div className="updates-grid">
          {[
            { campaign: completedWater, date: '18 Mar 2026', label: 'Impact verified', title: 'Clean water is now flowing for 340 people', body: 'Independent water testing passed and the final contractor payment was reconciled.' },
            { campaign: completedFood, date: '12 Mar 2026', label: 'Distribution verified', title: '250 food packs reached Mombasa households', body: 'Recipient counts, delivery photos and signed distribution records were reviewed.' },
            { campaign: campaigns[1], date: '06 Mar 2026', label: 'Milestone reached', title: 'Al-Rahmah mosque roofing is complete', body: 'The next approved release covers electrical work and the accessible water facility.' },
          ].map(update => <article className="update-card" key={update.title}>
            <div className="update-image">
              <Image src={update.campaign.image} alt="" width={760} height={500} sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"/>
              <span className="update-photo-badge"><Icon name="shield"/>{update.label}</span>
              <div className="update-image-content"><p className="update-meta"><span>{update.date}</span><span>{update.campaign.id}</span></p><h3>{update.title}</h3></div>
              <button className="update-photo-action" onClick={() => { setEvidenceOpen(true); setSelected(update.campaign); }} aria-label={`View ${update.title}`} />
            </div>
            <div className="update-summary"><p>{update.body}</p><button onClick={() => { setEvidenceOpen(true); setSelected(update.campaign); }} aria-label={`View evidence: ${update.title}`}>View evidence <span><Icon name="→"/></span></button></div>
          </article>)}
        </div>
      </section>

      <section className="how-section refined-how" id="how">
        <div className="section-heading centered"><div><p className="eyebrow">A clearer way to give</p><h2>Discover. Give. Track. See impact.</h2></div></div>
        <div className="steps-grid">
          {[['01','Discover verified need','Search by cause, location, giving type and verification level.'],['02','Choose your intention','Keep Zakat, Sadaqah, Sadaqah Jariyah and Waqf clearly separated.'],['03','Give securely','Use M-PESA or card, anonymously or as a recurring gift.'],['04','Follow the outcome','Receive receipts, disbursement updates and verified completion evidence.']].map(step => <article key={step[0]}><span>{step[0]}</span><h3>{step[1]}</h3><p>{step[2]}</p></article>)}
        </div>
      </section>

      <section className="donor-promise refined-promise" aria-label="The Amanah promise">
        <div className="promise-mark"><AmanahLogo variant="light" size="lg" showTagline={false}/></div>
        <div><p className="eyebrow light">The Amanah promise</p><h2>Your intention stays clear. Your gift stays accountable.</h2></div>
        <ol className="promise-points" aria-label="How your gift stays accountable">{['Giving type recorded', 'Funds restricted correctly', 'Every release approved', 'Impact evidence returned'].map((point, index) => <li key={point}><b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>{' '}<span className="promise-label">{point}</span></li>)}</ol>
      </section>

      <section className="platform-preview refined-ecosystem" aria-labelledby="ecosystem-title">
        <div className="platform-preview-copy"><p className="eyebrow">One mission. Six coordinated products.</p><h2 id="ecosystem-title">The complete giving ecosystem.</h2><p>Donors see impact. Beneficiaries request help privately. Organizations deliver transparently. Admin, finance and Shariah teams protect every decision behind the scenes.</p><button className="button" onClick={() => { setPlatformPortal('donor'); setPlatformOpen(true); }}>Explore the full platform <Icon name="↗"/></button></div>
        <div className="platform-preview-grid">{([
          ['donor','heart','Donor','Give, plan and trace'],
          ['beneficiary','giving','Beneficiary','Request help privately'],
          ['organization','platform','Organization','Deliver with evidence'],
          ['admin','shield','Admin','Verify and protect'],
          ['finance','wallet','Finance','Reconcile every fund'],
          ['shariah','book','Shariah','Govern with clarity'],
        ] as const).map(([portal, icon, label, description]) => <button key={portal} onClick={() => { setPlatformPortal(portal); setPlatformOpen(true); }} aria-label={`Explore ${label} workspace: ${description}`}><i><Icon name={icon}/></i><span><b>{label}</b><small>{description}</small></span><em><Icon name="→"/></em></button>)}</div>
      </section>

      <section className="organizations refined-organizations" aria-labelledby="organizations-title">
        <div className="organizations-copy"><p className="eyebrow light">Verified organizations</p><h2 id="organizations-title">Trusted locally.<br/>Accountable publicly.</h2><p>Every organization profile clearly shows what was checked, who is responsible, and the latest verified impact.</p><a className="outline-button" href="/verified-charities">Explore organizations <Icon name="→"/></a></div>
        <article className="org-card" aria-labelledby="featured-org-title">
          <div className="org-card-heading"><span className="org-logo" aria-hidden="true">AR</span><span className="org-verification"><Icon name="shield"/>Organization verified</span><span className="score" aria-label="Organization rating A plus">A+<small>Rating</small></span></div>
          <h3 id="featured-org-title">Al-Rahmah Community Trust</h3>
          <p className="org-location"><Icon name="home"/>Nairobi, Kenya</p>
          <dl className="org-metrics"><div><dt>Active projects</dt><dd>12</dd></div><div><dt>Reporting score</dt><dd>94<small>%</small></dd></div></dl>
          <div className="org-reporting" role="meter" aria-label="Reporting score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={94}><span/></div>
        </article>
      </section>

      <footer className="refined-footer">
        <div className="footer-brand"><a className="brand inverse" href="#top" aria-label="Amanah Giving home"><AmanahLogo variant="light" size="md"/></a><p>Transparent, secure and Shariah-aware digital giving.</p></div>
        <div className="footer-links">
          <nav aria-label="Giving links"><h3>Give</h3><a href="#causes">Urgent appeals</a><a href="#zakat">Zakat Center</a><a href="#impact">Impact Center</a><a href="/sadaqah">Sadaqah giving</a></nav>
          <nav aria-label="Platform links"><h3>Platform</h3><a href="#how">How it works</a><a href="/about">About Amanah</a><a href="/verified-charities">Verified charities</a><button onClick={() => setPlatformOpen(true)}>Request assistance</button><button onClick={() => setPlatformOpen(true)}>For organizations</button></nav>
          <nav aria-label="Trust and support links"><h3>Trust</h3><a href="/faq">FAQ</a><a href="/contact">Contact</a><a href="/policies">Privacy and terms</a><button onClick={() => setPlatformOpen(true)}>Shariah governance</button></nav>
        </div>
        <div className="footer-cta"><p>Ready to make an impact?</p><button className="button sand" onClick={() => startDonation()}>Give now <Icon name="↗"/></button></div>
      </footer>
      <div className="footer-bottom refined-footer-bottom"><span>© 2026 Amanah Giving · Kenya</span><div><span>English · More languages planned</span><span className="footer-security"><Icon name="shield"/>Secure giving</span></div></div>

      <MobileNavigation onGive={() => startDonation()} onAccount={() => setDashboardOpen(true)} accountOpen={dashboardOpen}/>

      {searchOpen && <div className="overlay" role="dialog" aria-modal="true" aria-label="Search verified campaigns"><div className="search-panel"><button className="close" aria-label="Close dialog" onClick={() => setSearchOpen(false)}><Icon name="×"/></button><p className="eyebrow">Search Amanah Giving</p><h2>Find a cause close to your heart.</h2><div className="search-input"><span><Icon name="⌕"/></span><input autoFocus value={query} onChange={event => setQuery(event.target.value)} aria-label="Search campaigns" placeholder="Try ‘orphan Kisumu’ or ‘water Garissa’" /></div><div className="filter-row" aria-label="Filter search results">{['All','Zakat','Food','Orphans','Water','Mosque','Health','Education'].map(item => <button className={filter === item ? 'active' : ''} aria-pressed={filter === item} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="search-results">{filteredCampaigns.map(campaign => <button key={campaign.id} onClick={() => { setSearchOpen(false); setEvidenceOpen(false); setSelected(campaign); }}><Image src={campaign.image} alt="" width={96} height={72}/><span><b>{campaign.title}</b><small>{campaign.meta} · {campaign.zakat ? 'Zakat eligible' : campaign.category}</small></span><em>{Math.round(campaign.raised / campaign.goal * 100)}%</em></button>)}</div>{!filteredCampaigns.length && <div className="empty-state" role="status">No verified campaigns match your search.</div>}</div></div>}

      {selected && <div className="overlay" role="dialog" aria-modal="true" aria-label="Campaign details"><div className="detail-panel"><button className="close" aria-label="Close dialog" onClick={() => setSelected(null)}><Icon name="×"/></button><div className="detail-media"><Image className="detail-hero" src={selected.image} alt="" width={1000} height={640} sizes="(max-width: 700px) 100vw, 800px"/><div className="detail-media-caption"><span>LEVEL 3 VERIFIED</span><b>Field need and budget reviewed</b><button onClick={() => setEvidenceOpen(!evidenceOpen)}>{evidenceOpen ? 'Hide verification summary' : 'See verification summary'} <Icon name="↗"/></button></div></div><div className="detail-content"><p className="verified"><Icon name="●"/> Campaign verified · {selected.id}</p><h2>{selected.title}</h2><p>{selected.story}</p><div className="detail-facts"><span><b>{money(selected.raised)}</b>raised</span><span><b>{selected.donors.toLocaleString()}</b>donors</span><span><b>{selected.days ? selected.days : 'Complete'}</b>{selected.days ? 'days left' : 'project status'}</span></div><p className="preview-note">Illustrative campaign record · verification documents are not connected.</p>{evidenceOpen && <section className="evidence-summary"><h3>Verification summary</h3><p>Review covers the organization, project scope, budget and payment destination. Original field evidence is not available in this frontend preview.</p><dl><div><dt>Reference</dt><dd>{selected.id}</dd></div><div><dt>Status</dt><dd>{selected.days ? 'Active appeal example' : 'Completed delivery example'}</dd></div></dl><button className="text-link" onClick={() => downloadText(`${selected.id}-summary.txt`, `${selected.title}\n${selected.id}\n${selected.story}\nIllustrative summary. Not an original verification document.`)}>Download example summary <Icon name="download"/></button></section>}<div className="budget"><h3>Transparent budget</h3><div><span>Project delivery</span><b>82%</b></div><div><span>Verification & reporting</span><b>8%</b></div><div><span>Payment and operations</span><b>10%</b></div></div><div className="disbursement-preview"><div><span>DISBURSEMENT PLAN</span><b>{selected.days ? 'Released only against milestones' : 'Completed delivery record'}</b></div>{selected.days === 0 ? <p>All delivery milestones are complete in this example. Delivery checks and reconciliation are complete in this illustrative record.</p> : <ol><li className="done"><i><Icon name="✓"/></i><span><b>Mobilization</b><small>20% · reconciled</small></span></li><li className="active"><i>2</i><span><b>Core delivery</b><small>45% · evidence required</small></span></li><li><i>3</i><span><b>Completion</b><small>25% · pending</small></span></li><li><i>4</i><span><b>Retention</b><small>10% · after impact review</small></span></li></ol>}</div><div className="verification-box"><b>What we verified</b><p>Responsible organization, supporting documents, field need, budget, payment destination and update schedule.</p></div><div className="detail-assurances"><span><Icon name="▣"/> Restricted fund</span><span><Icon name="◎"/> Update schedule</span><span><Icon name="✓"/> Complaint channel</span></div>{selected.days > 0 ? <button className="button full" onClick={() => { const campaign = selected; setSelected(null); startDonation(campaign); }}>Donate to this campaign <Icon name="↗"/></button> : <button className="button full" onClick={() => { setSelected(null); document.getElementById('causes')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore active causes <Icon name="↗"/></button>}</div></div></div>}

      {donationStep > 0 && renderDonationModal()}

      {dashboardOpen && <MyGiving drafts={drafts} saved={campaigns.filter(c => saved.includes(c.id))} onClose={() => setDashboardOpen(false)} onView={id => { setDashboardOpen(false); setEvidenceOpen(false); setSelected(campaigns.find(c => c.id === id) || null); }} onRemove={toggleSaved} onGive={() => { setDashboardOpen(false); startDonation(); }} onPlan={() => { setDashboardOpen(false); setPlannerOpen(true); }} onNotifications={() => { setDashboardOpen(false); setNotificationsOpen(true); }}/>}

      {platformOpen && <PlatformConsole initialPortal={platformPortal} onClose={() => setPlatformOpen(false)} onGive={() => { setPlatformOpen(false); startDonation(); }}/>}
      {plannerOpen && <GivingPlanner onClose={() => setPlannerOpen(false)} onCreate={plan => { setPlannerOpen(false); startDonation(null, 'Sadaqah'); setAmount(plan.amount); setRecurring(true); setSchedule(plan.schedule === 'Monthly Sadaqah' ? 'Monthly' : plan.schedule === 'Last 10 nights' ? 'Last 10 nights' : plan.schedule); setPlanCause(plan.cause); setPlanReminders(plan.reminders); }}/>}

      {notificationsOpen && <NotificationCenter read={readNotifications} onRead={setReadNotifications} onClose={() => setNotificationsOpen(false)}/>}

      {languagesOpen && <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="language-title"><div className="search-panel language-panel"><button className="close" aria-label="Close languages" onClick={() => setLanguagesOpen(false)}><Icon name="close"/></button><p className="eyebrow">Language</p><h2 id="language-title">Read with clarity.</h2><p>English is available throughout this preview. Other languages will be offered after every page and giving step has been translated.</p><div className="language-options"><button aria-pressed="true" onClick={() => setLanguagesOpen(false)}><b>English</b><span>Current language <Icon name="check"/></span></button><div><b>Kiswahili</b><span>Translation in preparation</span></div><div lang="ar"><b>العربية</b><span lang="en">Translation in preparation</span></div></div></div></div>}
      {toast && <div className="toast" role="status" aria-live="polite"><span><Icon name="✓"/></span>{toast}</div>}
      <a className="back-to-top" href="#top" aria-label="Back to top"><Icon name="↑"/></a>
    </main>
  );

  function renderDonationModal() {
    const numericAmount = Number(amount) || 0;
    const fee = coverFees ? Math.ceil(numericAmount * 0.018) : 0;
    const tip = Math.ceil(numericAmount * platformTip / 100);
    return <div className="overlay" role="dialog" aria-modal="true" aria-label="Donation checkout"><div className="donation-panel refined-checkout"><button className="close" aria-label="Close dialog" onClick={() => { setDonationStep(0); setDraft(null); setDraftError(''); setDonationCampaign(null); }}><Icon name="×"/></button>{donationStep < 4 && <><div className="checkout-heading"><p className="eyebrow">Prepare your gift</p><div className="checkout-assurance"><span><Icon name="▣"/> Local draft</span><span><Icon name="✓"/> No payment</span><span><Icon name="shield"/> Private</span></div></div><ol className="checkout-stages" aria-label="Donation progress">{['Intention', 'Amount', 'Review'].map((label, index) => <li key={label} className={donationStep > index + 1 ? 'done' : donationStep === index + 1 ? 'current' : ''} aria-current={donationStep === index + 1 ? 'step' : undefined}><span aria-hidden="true">{donationStep > index + 1 ? <Icon name="✓"/> : index + 1}</span><b>{label}</b></li>)}</ol></>}
      {donationStep === 1 && <form className="donation-step intention-step" onSubmit={event => { event.preventDefault(); setDonationStep(2); }}><h2 id="intention-title">What is your intention?</h2><p id="intention-help">Your selected giving type stays with your donation for clear accounting.</p><fieldset className="intention-options" aria-describedby="intention-help"><legend className="sr-only">Choose your giving intention</legend>{[
        ['Sadaqah','heart','Verified giving'], ['Zakat','shield','Restricted fund'], ['Sadaqah Jariyah','∞','Ongoing benefit'], ['Waqf','bank','Verified giving'], ['Fidyah / Kaffarah','giving','Verified giving'], ['General charity','gift','Verified giving'],
      ].map(([item, icon, description]) => <label className={`intention-option ${intention === item ? 'selected' : ''}`} key={item}><input type="radio" name="giving-intention" value={item} checked={intention === item} onChange={() => setIntention(item)}/><span className="intention-icon" aria-hidden="true"><Icon name={icon}/></span><span className="intention-check" aria-hidden="true">{intention === item && <Icon name="✓"/>}</span><b>{item}</b><small>{description}</small></label>)}</fieldset><button className="button full" type="submit">Continue to amount <Icon name="→"/></button></form>}
      {donationStep === 2 && <div className="donation-step"><button className="back" onClick={() => setDonationStep(1)}><Icon name="←"/> Back</button><h2>Shape your gift</h2>{donationCampaign && <div className="donation-campaign"><Image src={donationCampaign.image} alt="" width={100} height={80}/><span><small>Giving to</small><b>{donationCampaign.title}</b></span></div>}<div className="amount-grid">{['500','1000','2500','5000'].map(value => <button className={amount === value ? 'selected' : ''} aria-pressed={amount === value} key={value} onClick={() => setAmount(value)}>KSh {Number(value).toLocaleString()}</button>)}</div><label className="custom-amount"><span>Custom amount</span><div><small>KSh</small><input inputMode="numeric" value={amount} aria-label="Custom donation amount in Kenyan shillings" onChange={event => setAmount(event.target.value.replace(/\D/g,'').slice(0,9))}/></div></label><label className="check-row"><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)}/><span><b>Give anonymously</b><small>Your identity stays private publicly.</small></span></label><label className="check-row"><input type="checkbox" checked={onBehalf} onChange={event => setOnBehalf(event.target.checked)}/><span><b>Give on behalf of someone</b><small>Keep a dedication with your giving draft.</small></span></label>{onBehalf && <label className="dedication-field"><span>Dedication or name</span><input value={dedication} onChange={event => setDedication(event.target.value.slice(0,80))} placeholder="In honour or memory of…"/></label>}<label className="check-row"><input type="checkbox" checked={recurring} onChange={event => setRecurring(event.target.checked)}/><span><b>Make this recurring</b><small>Save a schedule preference. Automatic payments are not activated.</small></span></label>{recurring && <label className="schedule-field"><span>Giving schedule</span><select value={schedule} onChange={event => setSchedule(event.target.value)}>{['Daily', 'Every Jumu’ah', 'Monthly', 'Last 10 nights', 'Qurbani reserve'].map(value => <option key={value}>{value}</option>)}</select></label>}<button className="button full" disabled={!numericAmount || numericAmount > 999999999} onClick={() => setDonationStep(3)}>Review your gift <Icon name="→"/></button></div>}
      {donationStep === 3 && <form className="donation-step" onSubmit={finishDonation} aria-busy={draftSaving}><button type="button" className="back" onClick={() => setDonationStep(2)}><Icon name="←"/> Back</button><h2>Review your giving draft</h2><p className="preview-note">No money will move. Your choices are saved only in this browser.</p><div className="payment-tabs three-tabs"><button type="button" aria-pressed={payment === 'M-PESA'} className={payment === 'M-PESA' ? 'active' : ''} onClick={() => setPayment('M-PESA')}>M-PESA</button><button type="button" aria-pressed={payment === 'Card'} className={payment === 'Card' ? 'active' : ''} onClick={() => setPayment('Card')}>Card</button><button type="button" aria-pressed={payment === 'Bank'} className={payment === 'Bank' ? 'active' : ''} onClick={() => setPayment('Bank')}>Bank</button></div><div className="preview-note" role="note"><b>{payment} · Not connected</b><p>{payment === 'M-PESA' ? 'No M-PESA prompt will be sent. Save your preferred method for later.' : payment === 'Card' ? 'Card checkout is not connected. Do not enter card details in this preview.' : 'No bank transfer will be reserved. Bank details will be available when payments are connected.'}</p></div><label className="check-row"><input type="checkbox" checked={coverFees} onChange={event => setCoverFees(event.target.checked)}/><span><b>Include estimated payment costs</b><small>Add KSh {Math.ceil(numericAmount * 0.018).toLocaleString()} in this illustrative estimate. Actual provider costs may differ.</small></span></label><div className="tip-control"><div><span><b>Support the Amanah platform</b><small>Optional and always shown separately.</small></span><strong>{platformTip}%</strong></div><input aria-label="Optional platform support percentage" type="range" min="0" max="10" step="2" value={platformTip} onChange={event => setPlatformTip(Number(event.target.value))}/><div><button type="button" onClick={() => setPlatformTip(0)}>No tip</button><button type="button" onClick={() => setPlatformTip(5)}>5%</button><button type="button" onClick={() => setPlatformTip(10)}>10%</button></div></div><dl className="plan-review"><div><dt>Preferred cause</dt><dd>{donationCampaign?.title || planCause}</dd></div>{recurring && <><div><dt>Schedule</dt><dd>{schedule}</dd></div><div><dt>Reminders</dt><dd>{planReminders ? 'Requested · not activated' : 'Off'}</dd></div></>}<div><dt>Public identity</dt><dd>{anonymous ? 'Anonymous' : 'Not anonymous'}</dd></div>{onBehalf && dedication && <div><dt>Dedication</dt><dd>{dedication}</dd></div>}</dl><div className="payment-summary"><span>Your {intention}{recurring ? ` · ${schedule}` : ''}</span><b>KSh {(numericAmount + fee + tip).toLocaleString()}</b><small>Gift {numericAmount.toLocaleString()} + costs {fee.toLocaleString()} + optional support {tip.toLocaleString()}</small></div>{draftError && <p className="form-error" role="alert">{draftError}</p>}<button className="button full" type="submit" disabled={draftSaving}>{draftSaving ? 'Saving draft…' : 'Save giving draft'} <Icon name="→"/></button><p className="secure-note"><Icon name="▣"/> This saves a plan, not a payment receipt. No recurring charges are enabled.</p></form>}
      {donationStep === 4 && draft && <div className="receipt"><span className="receipt-check"><Icon name="check"/></span><p className="eyebrow">Giving draft saved</p><h2>Your intention, ready for later.</h2><p>Saved on this device. No payment was made and no recurring schedule was activated.</p><div className="receipt-card"><span>GIFT<b>KSh {draft.amount.toLocaleString()}</b></span><span>TYPE<b>{draft.intention}</b></span><span>CAUSE<b>{draft.campaign}</b></span><span>DRAFT REFERENCE<b>{draft.id}</b></span></div><button className="button full" onClick={() => { setDonationStep(0); setDashboardOpen(true); }}>Open My Giving <Icon name="arrow-right"/></button><button className="download-receipt" onClick={() => downloadText(`${draft.id}.txt`, draftText([draft]))}>Download giving draft <Icon name="download"/></button></div>}</div></div>;
  }
}
