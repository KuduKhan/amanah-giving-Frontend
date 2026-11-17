'use client';

import Icon from './Icon';
import FooterBrandIcon from './FooterBrandIcon';
import CampaignDetails from './CampaignDetails';
import SiteHeader from './SiteHeader';
import AmanahLogo from './AmanahLogo';
import NotificationCenter from './NotificationCenter';
import MyGiving from './MyGiving';
import MobileNavigation from './MobileNavigation';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import PlatformConsole, { portals, type Portal } from './PlatformConsole';
import GivingPlanner, { type GivingOccasion } from './GivingPlanner';
import Image from 'next/image';
import Link from 'next/link';
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

const knowledgePrograms = [
  { title: 'Qur’an distribution', category: 'Qur’an access', icon: 'book', summary: 'Place Qur’ans in community learning spaces and study circles.' },
  { title: 'Madrasa books & supplies', category: 'Madrasa learning', icon: 'education', summary: 'Equip learners with books and essential classroom materials.' },
  { title: 'Sponsor a student', category: 'Student support', icon: 'users', summary: 'Help students pursue Islamic studies with the resources they need.' },
  { title: 'Accessible Qur’an projects', category: 'Inclusive learning', icon: 'evidence', summary: 'Make learning more inclusive with translations, Braille Qur’ans and accessible formats.' },
];

const notificationIds = ['impact', 'receipt', 'plan', 'security'];
const notificationReadKey = 'amanah-notifications-read';

const completedWater: Campaign = { ...campaigns[0], id: 'WTR-183', title: 'Al-Huda water project in Garissa', raised: 5000000, goal: 5000000, days: 0, badge: 'Completed', story: 'This example completed project serves 340 people. The timeline illustrates how a completed delivery is recorded separately from an active appeal.' };

const completedFood: Campaign = { ...campaigns[2], id: 'FOD-398', title: 'Food distribution to 250 Mombasa households', raised: 1250000, goal: 1250000, days: 0, badge: 'Completed', story: 'This example completed distribution reached 250 households. Delivery counts and distribution records illustrate a closed delivery, separate from the current appeal.' };

const waterProjectStages = [
  { date: '14 Jan', dateTime: '2026-01-14', title: 'You donated KSh 5,000', detail: 'Payment confirmed and receipt issued.', icon: 'receipt' },
  { date: '28 Jan', dateTime: '2026-01-28', title: 'Campaign fully funded', detail: `Restricted funds locked to ${completedWater.id}.`, icon: 'wallet' },
  { date: '12 Feb', dateTime: '2026-02-12', title: 'Borehole drilling approved', detail: 'Maker, checker and approver controls passed.', icon: 'check' },
  { date: '05 Mar', dateTime: '2026-03-05', title: 'Water test completed', detail: 'Independent results uploaded and reviewed.', icon: '≈' },
  { date: '18 Mar', dateTime: '2026-03-18', title: 'Project impact verified', detail: 'Now serving 340 people in Garissa.', icon: 'shield' },
];

const causeFilters = [
  ['All', 'platform'], ['Zakat', 'giving'], ['Food', '□'], ['Orphans', 'users'],
  ['Water', '≈'], ['Mosque', 'bank'], ['Health', 'healthcare'], ['Education', 'education'],
] as const;

const givingSteps = [
  ['01', 'search', 'Discover verified need', 'Search by cause, location, giving type and verification level.'],
  ['02', 'giving', 'Choose your intention', 'Keep Zakat, Sadaqah, Sadaqah Jariyah and Waqf clearly separated.'],
  ['03', 'wallet', 'Prepare your gift', 'Choose an amount and review your giving draft before saving it.'],
  ['04', 'evidence', 'Follow the outcome', 'See how disbursements and verified outcomes appear in the example records.'],
] as const;

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
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [shareStatus, setShareStatus] = useState('');
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformPortal, setPlatformPortal] = useState<Portal>('donor');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerOccasion, setPlannerOccasion] = useState<GivingOccasion>('jumuah');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>(['security']);
  const [notificationReadError, setNotificationReadError] = useState('');
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
    const frame = requestAnimationFrame(() => {
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(notificationReadKey) || 'null');
        if (Array.isArray(saved)) {
          setReadNotifications(saved.filter((id): id is string => typeof id === 'string' && notificationIds.includes(id)));
        }
      } catch {
        setNotificationReadError('Read status is only available for this session.');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const animatedSections = document.querySelectorAll<HTMLElement>('.refined-impact .impact-timeline, .refined-hero .hero-visual');
    if (!animatedSections.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-active', entry.isIntersecting));
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    animatedSections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const background = Array.from(document.getElementById('main-content')?.children || []).filter((child): child is HTMLElement => child instanceof HTMLElement && !child.matches('[aria-modal=true], .toast'));
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
    const frame = requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
      if (dialog && !dialog.contains(document.activeElement)) {
        (modalKey === 'search' ? searchInputRef.current : dialog.querySelector<HTMLElement>(focusable))?.focus();
      }
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

  const updateReadNotifications = (ids: string[]) => {
    const next = notificationIds.filter(id => ids.includes(id));
    setReadNotifications(next);
    try {
      localStorage.setItem(notificationReadKey, JSON.stringify(next));
      setNotificationReadError('');
    } catch {
      setNotificationReadError('Read status is only saved for this session.');
    }
  };

  function openPlanner(occasion: GivingOccasion = 'jumuah') {
    setPlannerOccasion(occasion);
    setPlannerOpen(true);
  }

  async function sharePage() {
    setShareStatus('');
    const shareData = {
      title: document.title,
      text: 'Transparent, secure and Shariah-aware digital giving.',
      url: window.location.href,
    };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        setShareStatus('Thanks for sharing!');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    if (typeof navigator.clipboard?.writeText !== 'function') {
      setShareStatus('Copy the page link from your browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareStatus('Link copied.');
    } catch {
      setShareStatus('Could not copy link.');
    }
  }

  function startDonation(campaign?: Campaign | null, preset?: string, cause = 'Where most needed') {
    setDonationCampaign(campaign || null);
    setDonationStep(1);
    setDraft(null); setDraftError('');
    setIntention(preset || (campaign?.zakat ? 'Zakat' : 'Sadaqah'));
    setAmount('1000');
    setAnonymous(false); setRecurring(false); setCoverFees(true); setPayment('M-PESA');
    setPlanCause(cause); setPlanReminders(false);
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
      <SiteHeader labels={t} language={language} unreadCount={notificationIds.filter(id => !readNotifications.includes(id)).length} onLanguage={() => setLanguagesOpen(true)} onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen(true)} onAccount={() => setDashboardOpen(true)} onGive={() => startDonation()} onPlatform={() => setPlatformOpen(true)}/>

      <section className="hero refined-hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 id="hero-title"><span>{t.titleA}</span> <em>{t.titleB}</em></h1>
          <div className="hero-giving">
            <p className="hero-lead">{t.lead}</p>
            <div className="hero-actions">
              <a className="button" href="#causes"><span>Explore verified causes</span><Icon name="↓"/></a>
              <a className="hero-secondary" href="#how"><span>How giving works</span><Icon name="arrow-right"/></a>
            </div>
          </div>
          <div className="hero-proof" aria-label="Illustrative Amanah Giving figures"><div><b>4.9/5</b><small>sample rating</small></div><div><b>218</b><small>sample campaigns</small></div><div><b>KSh 246M+</b><small>sample impact</small></div></div>
        </div>
        <div className="hero-visual">
          <Image src="/water-community.jpg" alt="Children gathering at a rural community water well" width={1400} height={1200} priority sizes="(max-width: 1050px) 100vw, 50vw" />
          <div className="live-giving">
            <span className="live-pulse" aria-hidden="true"/><span><b>38 sample gifts</b> in this example</span>
          </div>
          <div className="impact-card">
            <div className="hero-impact-label"><Icon name="shield"/><b>Example impact</b></div>
            <p>Garissa water project now serves 340 people.</p>
            <small className="hero-evidence-time"><Icon name="◷"/>Sample evidence record</small>
          </div>
          <div className="hero-caption">
            <span>WTR-183 · SADAQAH JARIYAH</span>
            <p>From your giving to safe, flowing water.</p>
            <button aria-haspopup="dialog" onClick={() => { setEvidenceOpen(true); setSelected(completedWater); }}>Trace this project <Icon name="arrow-right"/></button>
          </div>
        </div>
      </section>

      <section className="refined-ecosystem ecosystem-strip" id="giving-ecosystem" aria-labelledby="ecosystem-title">
        <div className="cause-strip refined-causes">
          {portals.map(({ id, icon, label, role }) => (
            <button type="button" key={id} aria-haspopup="dialog" onClick={() => { setPlatformPortal(id); setPlatformOpen(true); }}>
              <span className="cause-icon"><Icon name={icon}/></span>
              <span className="cause-label">{label}</span>
              <small>{role}</small>
            </button>
          ))}
        </div>
        <div className="platform-preview-copy">
          <p className="eyebrow">One mission. Six coordinated products.</p>
          <h2 id="ecosystem-title">The complete giving ecosystem.</h2>
          <p>Donors see impact. Beneficiaries request help privately. Organizations deliver transparently. Admin, finance and Shariah teams protect every decision behind the scenes.</p>
          <button type="button" className="button" aria-haspopup="dialog" onClick={() => { setPlatformPortal('donor'); setPlatformOpen(true); }}>
            Explore the full platform <Icon name="arrow-right"/>
          </button>
        </div>
      </section>

      <section className="seasonal-giving refined-seasonal" aria-labelledby="seasonal-title">
        <div className="seasonal-heading">
          <p className="eyebrow">Give in every season</p>
          <h2 id="seasonal-title">Timely worship, thoughtfully prepared.</h2>
          <p>Plan ahead for sacred days and build a regular giving habit. Review your intention, amount and cause before saving a draft.</p>
          <button className="button" aria-haspopup="dialog" onClick={() => openPlanner()}>Build my giving plan <Icon name="arrow-right"/></button>
        </div>
        <div className="seasonal-track">{([
          ['jumuah', 'calendar', 'Every Friday', 'Jumu’ah giving', 'Plan a small, consistent Sadaqah each Friday.', 'Create weekly plan'],
          ['ramadan', '☾', 'Ramadan', 'Last 10 nights', 'Plan a nightly gift for the final nights of Ramadan.', 'Prepare Ramadan plan'],
          ['qurbani', 'gift', 'Dhul Hijjah', 'Qurbani', 'Set aside a draft amount for your Qurbani.', 'Plan Qurbani'],
          ['fidyah', 'giving', 'Any time', 'Fidyah & Kaffarah', 'Prepare a giving draft with Fidyah or Kaffarah selected.', 'Prepare a gift'],
        ] as const).map(([occasion, icon, timing, title, detail, action]) => (
          <article key={occasion} data-occasion={occasion}>
            <div className="season-card-top"><div className="season-icon"><Icon name={icon}/></div><span>{timing}</span></div>
            <h3>{title}</h3><p>{detail}</p>
            <button type="button" aria-haspopup="dialog" onClick={() => occasion === 'fidyah' ? startDonation(null, 'Fidyah / Kaffarah') : openPlanner(occasion)}><span>{action}</span><Icon name="arrow-right"/></button>
          </article>
        ))}</div>
      </section>

      <section className="section refined-opportunities" id="causes" aria-labelledby="causes-title">
        <div className="section-heading"><div><p className="eyebrow">Example opportunities</p><h2 id="causes-title" tabIndex={-1}>Give where it matters most</h2></div><button className="text-link button-link" aria-haspopup="dialog" onClick={() => setSearchOpen(true)}><Icon name="search"/>Search all causes</button></div>
        <div className="cause-browser-bar">
          <div className="filter-row" role="group" aria-label="Filter verified causes">
            {causeFilters.map(([label, icon]) => <button className={filter === label ? 'active' : ''} aria-pressed={filter === label} key={label} onClick={() => setFilter(label)}><Icon name={icon}/>{label}</button>)}
          </div>
          <div className="cause-results-line">
            <p role="status">{filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'opportunity' : 'opportunities'}{query.trim() ? ` matching “${query.trim()}”` : ''}</p>
            {filter !== 'All' || query ? <button className="text-link" onClick={() => { setFilter('All'); setQuery(''); }}>Clear filters <Icon name="close"/></button> : null}
          </div>
        </div>
        <div className="campaign-grid">
          {filteredCampaigns.map(campaign => {
            const progress = Math.round(campaign.raised / campaign.goal * 100);
            return <article className="campaign-card" key={campaign.id} aria-labelledby={`title-${campaign.id}`}>
              <div className="campaign-image">
                <Image src={campaign.image} alt="" width={900} height={600} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" style={{ objectPosition: campaign.id === 'EDU-390' ? '50% 34%' : 'center' }} />
                <div className="campaign-photo-toolbar">
                  <span className="badge">{campaign.badge}</span>
                  <button className={`save ${saved.includes(campaign.id) ? 'saved' : ''}`} aria-pressed={saved.includes(campaign.id)} onClick={() => toggleSaved(campaign.id)} aria-label={`${saved.includes(campaign.id) ? 'Remove' : 'Save'} ${campaign.title}`}><Icon name={saved.includes(campaign.id) ? '♥' : '♡'}/></button>
                </div>
                <div className="campaign-image-content">
                <div className="campaign-meta-row"><p className="verified"><Icon name="shield"/><span>Example verification <span className="campaign-code">· {campaign.id}</span></span></p><span className={`campaign-deadline ${campaign.days <= 12 ? 'deadline-soon' : ''}`}><Icon name="◷"/>{campaign.days} days left</span></div>
                <h3 id={`title-${campaign.id}`}>{campaign.title}</h3>
                <p className="muted campaign-location"><span>{campaign.meta}</span><span aria-hidden="true">·</span><span>{campaign.donors.toLocaleString()} donors</span>{campaign.zakat && campaign.badge !== 'Zakat eligible' && <span className="campaign-eligibility">Zakat eligible</span>}</p>
                </div>
              </div>
              <div className="campaign-body">
                <div className="campaign-funding"><div className="money-row"><div className="funding-amount"><strong>{money(campaign.raised)}</strong><small>raised of {money(campaign.goal)}</small></div><b>{progress}% funded</b></div><div className="progress" role="progressbar" aria-label={`Funding for ${campaign.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, progress)} aria-valuetext={`${campaign.raised.toLocaleString()} Kenyan shillings raised of ${campaign.goal.toLocaleString()}`}><span style={{width: `${Math.min(100, progress)}%`}} /></div></div>
                <div className="card-footer"><button aria-haspopup="dialog" onClick={() => { setEvidenceOpen(false); setSelected(campaign); }} aria-label={`View details: ${campaign.title}`}>View details<Icon name="arrow-right"/></button><button className="donate-mini" aria-haspopup="dialog" onClick={() => startDonation(campaign)} aria-label={`Donate to ${campaign.title}`}>Donate<Icon name="giving"/></button></div>
              </div>
            </article>;
          })}
        </div>
        {!filteredCampaigns.length && <div className="empty-state" role="status">No verified campaigns match this search yet.</div>}
      </section>

      <section className="section refined-knowledge" id="knowledge" aria-labelledby="knowledge-title">
        <div className="section-heading">
          <div><p className="eyebrow">Spread knowledge</p><h2 id="knowledge-title">Make learning part of your giving.</h2></div>
        </div>
        <p className="knowledge-intro">Choose an example learning initiative to prepare a local draft. No payment is processed or delivery arranged.</p>
        <div className="knowledge-grid">
          {knowledgePrograms.map(program => (
            <article className="knowledge-card" key={program.title}>
              <div className="knowledge-card-top">
                <span className="knowledge-icon"><Icon name={program.icon}/></span>
                <p className="eyebrow">{program.category}</p>
              </div>
              <h3>{program.title}</h3>
              <p>{program.summary}</p>
              <button type="button" aria-haspopup="dialog" aria-label={`Prepare a local draft for ${program.title}`} onClick={() => startDonation(null, 'Sadaqah', `Knowledge · ${program.title}`)}>
                Prepare a local draft <Icon name="arrow-right"/>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="zakat-section refined-zakat" id="zakat" aria-labelledby="zakat-title">
        <div className="zakat-copy">
          <p className="eyebrow light">Dedicated Zakat Center</p>
          <h2 id="zakat-title"><span>Calculate with clarity.</span>{' '}<span>Give with confidence.</span></h2>
          <p>Your Zakat is recorded as a restricted giving type and never mixed with ordinary Sadaqah. Eligible campaigns are reviewed against versioned Shariah policy.</p>
          <ul role="list"><li><i><Icon name="giving"/></i>Illustrative 2.5% estimate at the shown threshold</li><li><i><Icon name="wallet"/></i>Separate ledger and distribution reporting</li><li><i><Icon name="shield"/></i>Calculation stays private on this device</li></ul>
        </div>
        <div className="calculator">
          <div className="calculator-top"><div><span>Illustrative nisab</span><b>KSh {nisab.toLocaleString('en-KE')}</b></div><span className="verified-pill"><Icon name="shield"/>Example threshold</span></div>
          <div className="calc-grid">
            {[['cash','Cash & savings'],['gold','Gold & silver value'],['investments','Investments'],['business','Business assets'],['receivables','Money owed to you'],['liabilities','Short-term liabilities']].map(([key,label]) => <label key={key}><span>{label}</span><div><small aria-hidden="true">KSh</small><input inputMode="numeric" aria-label={`${label} in Kenyan shillings`} autoComplete="off" value={zakat[key as keyof typeof zakat]} onChange={event => setZakat({...zakat, [key]: event.target.value.replace(/\D/g,'').slice(0,12)})} placeholder="0" /></div></label>)}
          </div>
          <div className="zakat-total" data-due={zakatDue > 0} role="status" aria-live="polite" aria-atomic="true"><span>Estimated Zakat due <small>{zakatNet < nisab ? 'Below nisab threshold' : '2.5% of eligible net assets'}</small></span><strong>KSh {Math.round(zakatDue).toLocaleString('en-KE')}</strong></div>
          <button className="button full" type="button" aria-haspopup="dialog" disabled={!zakatDue} onClick={() => { startDonation(null, 'Zakat'); setAmount(String(Math.round(zakatDue))); }}>Give my Zakat <Icon name="arrow-right"/></button>
          <p className="fine-print"><Icon name="evidence"/> <span>This calculator is an estimate, not a personal religious ruling.</span></p>
        </div>
      </section>

      <section className="impact-section refined-impact" id="impact" aria-labelledby="impact-title">
        <div className="impact-intro">
          <p className="eyebrow">Your giving, accounted for</p>
          <h2 id="impact-title">See exactly what happened next.</h2>
          <p>The donation button is only the beginning. Every verified update, approval, disbursement and outcome builds a traceable impact record.</p>
          <button className="button impact-center-button" aria-haspopup="dialog" onClick={() => setDashboardOpen(true)}>Open your Impact Center <Icon name="arrow-right"/></button>
        </div>
        <div className="impact-timeline">
          <div className="timeline-head">
            <p className="eyebrow">Project trace</p>
            <span className="complete"><Icon name="check"/>Completed</span>
            <h3>Al-Huda Water Project</h3>
            <small className="trace-record"><span>{completedWater.id}</span><span>Example record</span></small>
          </div>
          <ol className="impact-stages" aria-label="Project milestones">
            {waterProjectStages.map(({ date, dateTime, title, detail, icon }) => (
              <li className="timeline-item" key={dateTime}>
                <span className="timeline-dot" aria-hidden="true"><Icon name={icon}/></span>
                <time dateTime={dateTime}>{date}</time>
                <div><b>{title}</b><p>{detail}</p></div>
              </li>
            ))}
          </ol>
          <div className="evidence-row">
            <ul className="evidence-files" aria-label="Available evidence">
              <li><Icon name="photos"/>4 photos</li>
              <li><Icon name="receipt"/>2 receipts</li>
              <li><Icon name="evidence"/>Water test report</li>
            </ul>
            <button aria-haspopup="dialog" onClick={() => { setEvidenceOpen(true); setSelected(completedWater); }}>View evidence <Icon name="arrow-right"/></button>
          </div>
        </div>
      </section>

      <section className="stats-band refined-impact-stats" aria-label="Giving impact in numbers">
        {[['KSh 246,820,450','donated'],['18,742','families supported'],['2.4M','meals provided'],['189','water projects'],['4,280','orphans supported']].map(([value,label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
      </section>

      <section className="updates-section refined-updates" aria-labelledby="updates-title">
        <div className="section-heading"><div><p className="eyebrow">Example impact updates</p><h2 id="updates-title">Proof of progress, not promises.</h2></div><button className="text-link button-link" aria-haspopup="dialog" onClick={() => setNotificationsOpen(true)}>See all your updates <Icon name="arrow-right"/></button></div>
        <div className="updates-grid">
          {[
            { campaign: completedWater, date: '18 Mar 2026', isoDate: '2026-03-18', icon: 'shield', label: 'Example impact', title: 'Clean water is now flowing for 340 people', body: 'Independent water testing passed and the final contractor payment was reconciled.' },
            { campaign: completedFood, date: '12 Mar 2026', isoDate: '2026-03-12', icon: 'evidence', label: 'Example distribution', title: '250 food packs reached Mombasa households', body: 'Recipient counts, delivery photos and signed distribution records are shown as examples.' },
            { campaign: campaigns[1], date: '06 Mar 2026', isoDate: '2026-03-06', icon: 'check', label: 'Example milestone', title: 'Al-Rahmah mosque roofing is complete', body: 'An example next release covers electrical work and the accessible water facility.' },
          ].map(update => <article className="update-card" key={update.campaign.id} aria-labelledby={`update-${update.campaign.id}`}>
            <div className="update-image">
              <Image src={update.campaign.image} alt="" width={760} height={500} sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"/>
              <div className="update-image-toolbar">
                <span className="update-photo-badge"><Icon name={update.icon}/>{update.label}</span>
                <button type="button" className="update-evidence-pill" aria-haspopup="dialog" onClick={() => { setEvidenceOpen(true); setSelected(update.campaign); }} aria-label={`View evidence: ${update.title}`}>
                  <Icon name="evidence"/>View evidence
                </button>
              </div>
              <div className="update-image-content"><p className="update-meta"><time dateTime={update.isoDate}>{update.date}</time><span>{update.campaign.id}</span></p><h3 id={`update-${update.campaign.id}`}>{update.title}</h3></div>
            </div>
            <div className="update-summary"><p>{update.body}</p></div>
          </article>)}
        </div>
      </section>

      <section className="donor-promise refined-promise" aria-label="The Amanah promise">
        <div className="promise-mark"><AmanahLogo variant="light" size="lg" showTagline={false}/></div>
        <div><p className="eyebrow light">The Amanah promise</p><h2>Your intention stays clear. Your gift stays accountable.</h2></div>
        <ol className="promise-points" aria-label="How your gift stays accountable">{['Giving type recorded', 'Funds restricted correctly', 'Every release approved', 'Impact evidence returned'].map((point, index) => <li key={point}><b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>{' '}<span className="promise-label">{point}</span></li>)}</ol>
      </section>

      <section className="how-section refined-how" id="how" aria-labelledby="how-title">
        <div className="section-heading centered"><div><p className="eyebrow">A clearer way to give</p><h2 id="how-title">Discover. Give. Track. See impact.</h2></div></div>
        <ol className="steps-grid" role="list">
          {givingSteps.map(([number, icon, title, description]) => <li key={number}><article>
            <div className="step-signature"><i><Icon name={icon}/></i><span aria-hidden="true">{number}</span></div>
            <h3>{title}</h3><p>{description}</p>
          </article></li>)}
        </ol>
      </section>

      <section className="organizations refined-organizations" id="organizations" aria-labelledby="organizations-title">
        <div className="organizations-copy">
          <p className="eyebrow light">Example organization profile</p>
          <h2 id="organizations-title">Trusted locally.<br/>Accountable publicly.</h2>
          <p>Every organization profile clearly shows what was checked, who is responsible, and the latest verified impact.</p>
          <Link className="outline-button" href="/verified-charities">Explore organizations <Icon name="arrow-right"/></Link>
        </div>
        <article className="org-card" aria-labelledby="featured-org-title">
          <div className="org-card-heading">
            <span className="org-logo" aria-hidden="true">AR</span>
            <span className="org-verification"><Icon name="shield"/>Sample profile</span>
            <div className="score">A+<small>Rating</small></div>
          </div>
          <h3 id="featured-org-title">Al-Rahmah Community Trust</h3>
          <p className="org-location"><Icon name="home"/>Nairobi, Kenya</p>
          <dl className="org-metrics">
            <div><dt>Active projects</dt><dd>12</dd></div>
            <div><dt>Reporting score</dt><dd>94<small>%</small><meter className="org-reporting" min={0} max={100} value={94} aria-hidden="true"/></dd></div>
          </dl>
        </article>
      </section>

      <footer className="refined-footer">
        <div className="footer-brand">
          <a className="brand inverse" href="#top" aria-label="Amanah Giving home"><AmanahLogo variant="light" size="md"/></a>
          <p>Transparent, secure and Shariah-aware digital giving.</p>
          <p className="footer-feedback-copy" role={shareStatus ? 'status' : undefined} aria-live={shareStatus ? 'polite' : undefined}>
            {shareStatus || 'Your feedback helps us improve.'}
          </p>
          <div className="footer-brand-actions">
            <Link className="footer-brand-action" href="/contact#support-title"><Icon name="comment"/>Leave a comment</Link>
            <button className="footer-brand-action" type="button" onClick={sharePage}><Icon name="share"/>Share</button>
          </div>
        </div>
        <div className="footer-links">
          <nav aria-label="Giving links">
            <h3><Icon name="giving"/>Give</h3>
            <a href="#causes">Urgent appeals</a><a href="#zakat">Zakat Center</a><a href="#impact">Impact Center</a><a href="#knowledge">Knowledge projects</a><Link href="/sadaqah">Sadaqah giving</Link>
          </nav>
          <nav aria-label="Platform links">
            <h3><Icon name="platform"/>Platform</h3>
            <a href="#how">How it works</a><Link href="/about">About Amanah</Link><Link href="/verified-charities">Verified charities</Link>
            <button type="button" aria-haspopup="dialog" onClick={() => { setPlatformPortal('beneficiary'); setPlatformOpen(true); }}>Request assistance</button>
            <button type="button" aria-haspopup="dialog" onClick={() => { setPlatformPortal('organization'); setPlatformOpen(true); }}>For organizations</button>
          </nav>
          <nav aria-label="Trust and support links">
            <h3><Icon name="shield"/>Trust</h3>
            <Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link><Link href="/policies">Privacy and terms</Link>
            <button type="button" aria-haspopup="dialog" onClick={() => { setPlatformPortal('shariah'); setPlatformOpen(true); }}>Shariah governance</button>
          </nav>
        </div>
        <div className="footer-cta">
          <p>Ready to make an Impact?</p>
          <button className="button sand" type="button" aria-haspopup="dialog" onClick={() => startDonation()}>Give now <Icon name="arrow-right"/></button>
          <div className="footer-apps">
            <p>Get the app</p>
            <a className="footer-app-link" href="https://apps.apple.com/search?term=Amanah%20Giving" target="_blank" rel="noopener noreferrer" aria-label="Search for Amanah Giving on the Apple App Store">
              <FooterBrandIcon brand="apple" className="footer-store-icon apple"/>
              <span><strong>App Store</strong></span>
            </a>
            <a className="footer-app-link" href="https://play.google.com/store/search?q=Amanah%20Giving&c=apps" target="_blank" rel="noopener noreferrer" aria-label="Search for Amanah Giving on Google Play">
              <FooterBrandIcon brand="googleplay" className="footer-store-icon play"/>
              <span><strong>Google Play</strong></span>
            </a>
          </div>
        </div>
      </footer>
      <div className="footer-bottom refined-footer-bottom">
        <span className="footer-legal">
          <span className="footer-copyright">© 2026</span>
          <span className="footer-legal-brand">Amanah Giving</span>
          <span className="footer-legal-separator" aria-hidden="true">·</span>
          <span className="footer-legal-region">Kenya</span>
        </span>
        <nav className="footer-social-links" aria-label="Find Amanah Giving on social media">
          <a href="https://www.youtube.com/results?search_query=Amanah%20Giving" target="_blank" rel="noopener noreferrer" aria-label="Search for Amanah Giving on YouTube" title="Search Amanah Giving on YouTube">
            <FooterBrandIcon brand="youtube"/>
          </a>
          <a href="https://www.instagram.com/explore/search/keyword/?q=Amanah%20Giving" target="_blank" rel="noopener noreferrer" aria-label="Search for Amanah Giving on Instagram" title="Search Amanah Giving on Instagram">
            <FooterBrandIcon brand="instagram"/>
          </a>
          <a href="https://www.facebook.com/search/top?q=Amanah%20Giving" target="_blank" rel="noopener noreferrer" aria-label="Search for Amanah Giving on Facebook" title="Search Amanah Giving on Facebook">
            <FooterBrandIcon brand="facebook"/>
          </a>
          <a href="https://www.tiktok.com/search?q=Amanah%20Giving" target="_blank" rel="noopener noreferrer" aria-label="Search for Amanah Giving on TikTok" title="Search Amanah Giving on TikTok">
            <FooterBrandIcon brand="tiktok"/>
          </a>
        </nav>
        <div className="footer-trust">
          <span className="footer-security">
            <span className="footer-security-icon" aria-hidden="true"><Icon name="shield"/></span>
            <span className="footer-security-copy">Secure giving</span>
          </span>
        </div>
      </div>

      <MobileNavigation onGive={() => startDonation()} onAccount={() => setDashboardOpen(true)} accountOpen={dashboardOpen}/>

      {searchOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="campaign-search-title">
          <div className="search-panel campaign-search-panel">
            <button className="close" aria-label="Close dialog" onClick={() => setSearchOpen(false)}><Icon name="close"/></button>
            <p className="eyebrow">Search Amanah Giving</p>
            <h2 id="campaign-search-title">Find a cause close to your heart.</h2>
            <div className="search-input" role="search" aria-label="Find verified campaigns">
              <Icon name="search"/>
              <input ref={searchInputRef} value={query} onChange={event => setQuery(event.target.value)} aria-label="Search campaigns" placeholder="Try ‘water Garissa’" />
              {query && <button className="search-clear" aria-label="Clear search" onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}><Icon name="close"/></button>}
            </div>
            <div className="filter-row" role="group" aria-label="Filter search results">
              {causeFilters.map(([label]) => <button className={filter === label ? 'active' : ''} aria-pressed={filter === label} key={label} onClick={() => setFilter(label)}>{label}</button>)}
            </div>
            <p className="search-count" role="status">{filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'example campaign' : 'example campaigns'}</p>
            {filteredCampaigns.length > 0 ? (
              <div className="search-results">
                {filteredCampaigns.map(campaign => (
                  <button key={campaign.id} aria-haspopup="dialog" onClick={() => { setSearchOpen(false); setEvidenceOpen(false); setSelected(campaign); }}>
                    <Image src={campaign.image} alt="" width={120} height={96}/>
                    <span className="search-result-copy"><b>{campaign.title}</b><small>{campaign.meta} · {campaign.zakat ? 'Zakat eligible' : campaign.category}</small></span>
                    <span className="search-result-end"><span className="search-funded">{Math.round(campaign.raised / campaign.goal * 100)}% funded</span><Icon name="chevron"/></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state search-empty">
                <strong>No campaigns match this search.</strong>
                <button className="text-link" onClick={() => { setFilter('All'); setQuery(''); searchInputRef.current?.focus(); }}>Clear filters</button>
              </div>
            )}
          </div>
        </div>
      )}

      {selected && <CampaignDetails
        campaign={selected}
        raised={money(selected.raised)}
        evidenceOpen={evidenceOpen}
        onToggleEvidence={() => setEvidenceOpen(!evidenceOpen)}
        onClose={() => setSelected(null)}
        onAction={() => {
          setSelected(null);
          if (selected.days > 0) startDonation(selected);
          else requestAnimationFrame(() => {
            const heading = document.getElementById('causes-title');
            heading?.focus({ preventScroll: true });
            document.getElementById('causes')?.scrollIntoView();
          });
        }}
      />}

      {donationStep > 0 && renderDonationModal()}

      {dashboardOpen && <MyGiving drafts={drafts} saved={campaigns.filter(c => saved.includes(c.id))} onClose={() => setDashboardOpen(false)} onView={id => { setDashboardOpen(false); setEvidenceOpen(false); setSelected(campaigns.find(c => c.id === id) || null); }} onRemove={toggleSaved} onGive={() => { setDashboardOpen(false); startDonation(); }} onPlan={() => { setDashboardOpen(false); openPlanner(); }} onNotifications={() => { setDashboardOpen(false); setNotificationsOpen(true); }}/>}

      {platformOpen && <PlatformConsole initialPortal={platformPortal} onClose={() => setPlatformOpen(false)} onGive={() => { setPlatformOpen(false); startDonation(); }}/>}
      {plannerOpen && <GivingPlanner initialOccasion={plannerOccasion} onClose={() => setPlannerOpen(false)} onCreate={plan => { setPlannerOpen(false); startDonation(null, 'Sadaqah'); setAmount(plan.amount); setRecurring(true); setSchedule(plan.schedule === 'Monthly Sadaqah' ? 'Monthly' : plan.schedule); setPlanCause(plan.cause); setPlanReminders(plan.reminders); }}/>}

      {notificationsOpen && <NotificationCenter read={readNotifications} onRead={updateReadNotifications} readError={notificationReadError} onClose={() => setNotificationsOpen(false)}/>}

      {languagesOpen && (
        <div className="overlay language-overlay" role="dialog" aria-modal="true" aria-labelledby="language-title" aria-describedby="language-description">
          <div className="search-panel language-panel language-panel-premium">
            <button className="close" type="button" aria-label="Close languages" onClick={() => setLanguagesOpen(false)}><Icon name="close"/></button>
            <header className="language-panel-heading">
              <p className="eyebrow"><Icon name="globe"/>Language</p>
              <h2 id="language-title">Read with clarity.</h2>
              <p id="language-description">English is available throughout this preview. Other languages will be offered after every page and giving step has been translated.</p>
            </header>
            <div className="language-options language-choice-list" role="group" aria-label="Choose a language">
              <button type="button" className="language-choice language-choice-active" aria-pressed="true" onClick={() => setLanguagesOpen(false)}>
                <span className="language-choice-symbol" aria-hidden="true">EN</span>
                <span className="language-choice-copy"><b>English</b><small>Current language</small></span>
                <span className="language-choice-status" aria-hidden="true"><Icon name="check"/></span>
              </button>
              <div className="language-choice language-choice-pending" aria-disabled="true">
                <span className="language-choice-symbol" aria-hidden="true">SW</span>
                <span className="language-choice-copy"><b lang="sw">Kiswahili</b><small>Translation in preparation</small></span>
                <span className="language-choice-coming">Coming soon</span>
              </div>
              <div className="language-choice language-choice-pending" aria-disabled="true">
                <span className="language-choice-symbol language-choice-symbol-ar" aria-hidden="true" lang="ar">ع</span>
                <span className="language-choice-copy"><b lang="ar" dir="rtl">العربية</b><small>Translation in preparation</small></span>
                <span className="language-choice-coming">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
      )}
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
      ].map(([item, icon, description]) => {
        const zakatAvailable = item !== 'Zakat' || !donationCampaign || donationCampaign.zakat;
        return <label className={`intention-option ${intention === item ? 'selected' : ''} ${zakatAvailable ? '' : 'unavailable'}`} key={item}>
          <input type="radio" name="giving-intention" value={item} checked={intention === item} disabled={!zakatAvailable} onChange={() => setIntention(item)}/>
          <span className="intention-icon" aria-hidden="true"><Icon name={icon}/></span>
          <span className="intention-check" aria-hidden="true">{intention === item && <Icon name="✓"/>}</span>
          <b>{item}</b>
          <small>{!zakatAvailable ? 'Not eligible for this campaign' : description}</small>
        </label>;
      })}</fieldset><button className="button full" type="submit">Continue to amount <Icon name="→"/></button></form>}
      {donationStep === 2 && (
        <div className="donation-step giving-amount-step">
          <header className="giving-amount-heading">
            <button className="back" type="button" onClick={() => setDonationStep(1)} aria-label="Return to previous giving step"><Icon name="arrow-left"/> Back</button>
            <h2>Shape your gift</h2>
          </header>
          <div className="giving-amount-layout">
            <section className="giving-amount-panel" aria-label="Gift amount">
              {donationCampaign && (
                <div className="donation-campaign giving-amount-campaign">
                  <Image src={donationCampaign.image} alt="" width={100} height={80}/>
                  <span><small>Giving to</small><b>{donationCampaign.title}</b></span>
                </div>
              )}
              <div className="amount-grid giving-amount-presets" role="group" aria-label="Choose a suggested gift amount">
                {['500','1000','2500','5000'].map(value => (
                  <button type="button" className={amount === value ? 'selected' : ''} aria-pressed={amount === value} key={value} onClick={() => setAmount(value)}>KSh {Number(value).toLocaleString()}</button>
                ))}
              </div>
              <label className="custom-amount giving-amount-custom">
                <span>Custom amount</span>
                <div><small>KSh</small><input inputMode="numeric" value={amount} aria-label="Custom donation amount in Kenyan shillings" onChange={event => setAmount(event.target.value.replace(/\D/g,'').slice(0,9))}/></div>
              </label>
            </section>
            <section className="giving-amount-preferences" aria-label="Gift preferences">
              <label className="check-row giving-amount-option">
                <input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)}/>
                <span><b>Give anonymously</b><small>Your identity stays private publicly.</small></span>
              </label>
              <label className="check-row giving-amount-option">
                <input type="checkbox" checked={onBehalf} onChange={event => setOnBehalf(event.target.checked)}/>
                <span><b>Give on behalf of someone</b><small>Keep a dedication with your giving draft.</small></span>
              </label>
              {onBehalf && <label className="dedication-field giving-amount-extra"><span>Dedication or name</span><input value={dedication} onChange={event => setDedication(event.target.value.slice(0,80))} placeholder="In honour or memory of…"/></label>}
              <label className="check-row giving-amount-option">
                <input type="checkbox" checked={recurring} onChange={event => setRecurring(event.target.checked)}/>
                <span><b>Make this recurring</b><small>Save a schedule preference. Automatic payments are not activated.</small></span>
              </label>
              {recurring && <label className="schedule-field giving-amount-extra"><span>Giving schedule</span><select value={schedule} onChange={event => setSchedule(event.target.value)}>{['Daily', 'Every Jumu’ah', 'Monthly', 'Last 10 nights', 'Qurbani reserve'].map(value => <option key={value}>{value}</option>)}</select></label>}
            </section>
          </div>
          <button className="button full giving-amount-next" type="button" disabled={!numericAmount || numericAmount > 999999999} onClick={() => setDonationStep(3)}>Review your gift <Icon name="→"/></button>
        </div>
      )}
      {donationStep === 3 && (
        <form className="donation-step giving-review-step" onSubmit={finishDonation} aria-busy={draftSaving}>
          <header className="giving-review-heading">
            <button type="button" className="back" onClick={() => setDonationStep(2)} aria-label="Return to gift amount and options"><Icon name="arrow-left"/> Back</button>
            <div className="giving-review-title">
              <h2>Review your giving draft</h2>
              <p className="giving-review-intro">No money will move. Your choices are saved only in this browser.</p>
            </div>
          </header>
          <div className="giving-review-layout">
            <section className="giving-review-options" aria-label="Giving draft preferences">
              <div className="giving-review-card giving-review-payment">
                <div className="giving-review-card-heading">
                  <h3>Preferred method</h3>
                  <span className="giving-review-unconnected">Not connected</span>
                </div>
                <div className="payment-tabs three-tabs" role="group" aria-label="Preferred payment method for this draft">
                  <button type="button" aria-pressed={payment === 'M-PESA'} className={payment === 'M-PESA' ? 'active' : ''} onClick={() => setPayment('M-PESA')}><Icon name="phone" className="giving-review-method-icon"/><span>M-PESA</span></button>
                  <button type="button" aria-pressed={payment === 'Card'} className={payment === 'Card' ? 'active' : ''} onClick={() => setPayment('Card')}><Icon name="card" className="giving-review-method-icon"/><span>Card</span></button>
                  <button type="button" aria-pressed={payment === 'Bank'} className={payment === 'Bank' ? 'active' : ''} onClick={() => setPayment('Bank')}><Icon name="bank" className="giving-review-method-icon"/><span>Bank</span></button>
                </div>
                <div className="preview-note giving-review-method-note" role="note">
                  <b>{payment} · Not connected</b>
                  <p>{payment === 'M-PESA' ? 'No M-PESA prompt will be sent. Save your preferred method for later.' : payment === 'Card' ? 'Card checkout is not connected. Do not enter card details in this preview.' : 'No bank transfer will be reserved. Bank details will be available when payments are connected.'}</p>
                </div>
              </div>
              <div className="giving-review-card giving-review-fees">
                <label className="check-row giving-review-costs">
                  <input type="checkbox" checked={coverFees} onChange={event => setCoverFees(event.target.checked)}/>
                  <span>
                    <b>Include estimated payment costs</b>
                    <small>Add KSh {Math.ceil(numericAmount * 0.018).toLocaleString()} in this illustrative estimate. Actual provider costs may differ.</small>
                  </span>
                </label>
                <div className="tip-control giving-review-tip">
                  <div className="giving-review-tip-heading">
                    <span><b>Support the Amanah platform</b><small>Optional and always shown separately.</small></span>
                    <strong>{platformTip}%</strong>
                  </div>
                  <input aria-label="Optional platform support percentage" type="range" min="0" max="10" step="1" value={platformTip} onChange={event => setPlatformTip(Number(event.target.value))}/>
                  <div className="giving-review-tip-presets" role="group" aria-label="Optional support percentage presets">
                    <button type="button" aria-pressed={platformTip === 0} onClick={() => setPlatformTip(0)}>No tip</button>
                    <button type="button" aria-pressed={platformTip === 5} onClick={() => setPlatformTip(5)}>5%</button>
                    <button type="button" aria-pressed={platformTip === 10} onClick={() => setPlatformTip(10)}>10%</button>
                  </div>
                </div>
              </div>
            </section>
            <section className="giving-review-confirmation" aria-label="Giving draft summary">
              <div className="giving-review-card giving-review-detail-card">
                <h3>Draft details</h3>
                <dl className="plan-review giving-review-details">
                  <div><dt>Preferred cause</dt><dd>{donationCampaign?.title || planCause}</dd></div>
                  {recurring && <><div><dt>Schedule</dt><dd>{schedule}</dd></div><div><dt>Reminders</dt><dd>{planReminders ? 'Requested · not activated' : 'Off'}</dd></div></>}
                  <div><dt>Public identity</dt><dd>{anonymous ? 'Anonymous' : 'Not anonymous'}</dd></div>
                  {onBehalf && dedication && <div><dt>Dedication</dt><dd>{dedication}</dd></div>}
                </dl>
              </div>
              <div className="payment-summary giving-review-total" role="group" aria-label="Estimated giving draft total">
                <span>Your {intention}{recurring ? ` · ${schedule}` : ''}</span>
                <b>KSh {(numericAmount + fee + tip).toLocaleString()}</b>
                <small>Gift {numericAmount.toLocaleString()} + costs {fee.toLocaleString()} + optional support {tip.toLocaleString()}</small>
              </div>
              {draftError && <p className="form-error" role="alert">{draftError}</p>}
              <button className="button full giving-review-save" type="submit" disabled={draftSaving}>{draftSaving ? 'Saving draft…' : 'Save giving draft'} <Icon name="→"/></button>
              <p className="secure-note giving-review-disclaimer"><Icon name="▣"/> This saves a plan, not a payment receipt. No recurring charges are enabled.</p>
            </section>
          </div>
        </form>
      )}
      {donationStep === 4 && draft && <div className="receipt"><span className="receipt-check"><Icon name="check"/></span><p className="eyebrow">Giving draft saved</p><h2>Your intention, ready for later.</h2><p>Saved on this device. No payment was made and no recurring schedule was activated.</p><div className="receipt-card"><span>GIFT<b>KSh {draft.amount.toLocaleString()}</b></span><span>TYPE<b>{draft.intention}</b></span><span>CAUSE<b>{draft.campaign}</b></span><span>DRAFT REFERENCE<b>{draft.id}</b></span></div><button className="button full" onClick={() => { setDonationStep(0); setDashboardOpen(true); }}>Open My Giving <Icon name="arrow-right"/></button><button className="download-receipt" onClick={() => downloadText(`${draft.id}.txt`, draftText([draft]))}>Download giving draft <Icon name="download"/></button></div>}</div></div>;
  }
}
