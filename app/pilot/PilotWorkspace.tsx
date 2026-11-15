'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { downloadText } from '../givingDrafts';
import { campaigns, currency, emptyPilot, evolve, expired, milestones, pilotKey, reportingDate, summarize, type Event, type Pilot, type Status } from './model';

const roles = [
  ['Donor', 'heart'], ['Beneficiary', 'giving'], ['Organization', 'platform'],
  ['Admin', 'shield'], ['Finance', 'wallet'], ['Shariah', 'book'],
] as const;
const statusLabel: Record<Status, [string, string]> = {
  pending: ['Pending', 'Inasubiri'], confirmed: ['Confirmed', 'Imethibitishwa'],
  failed: ['Failed', 'Haikufaulu'], reversed: ['Reversed', 'Imerejeshwa'],
};
const timelineSw = ['Malipo yamethibitishwa', 'Fedha zimetengwa', 'Utoaji wa fedha umeidhinishwa', 'Fedha zimetolewa', 'Uwasilishaji umerekodiwa', 'Ushahidi umekaguliwa'];
const dateFormatters = {
  en: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Nairobi' }),
  sw: new Intl.DateTimeFormat('sw-KE', { dateStyle: 'medium', timeZone: 'Africa/Nairobi' }),
};

function readPilot(): Pilot {
  const raw = localStorage.getItem(pilotKey);
  if (!raw) return emptyPilot();
  const state = JSON.parse(raw) as Pilot;
  if (!state || !Array.isArray(state.gifts) || !Array.isArray(state.audit) || !state.approved || !state.reports) throw new Error('Invalid sample data');
  return { ...emptyPilot(), ...state };
}

export default function PilotWorkspace({ initialCampaign, transparencyOnly = false }: { initialCampaign?: string; transparencyOnly?: boolean }) {
  const initial = campaigns.find(campaign => campaign.id === initialCampaign)?.id ?? campaigns[0].id;
  const [state, setState] = useState(emptyPilot);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ section: 'page' | 'give' | 'impact' | 'operations' | 'recovery'; message: string } | null>(null);
  const [language, setLanguage] = useState('en');
  const [role, setRole] = useState<typeof roles[number][0]>('Donor');
  const [campaignId, setCampaignId] = useState<string>(initial);
  const [evidenceCampaign, setEvidenceCampaign] = useState<(typeof campaigns)[number]>(campaigns[0]);
  const [intent, setIntent] = useState<string>(initial);
  const [openGift, setOpenGift] = useState('');
  const [amount, setAmount] = useState('500');
  const [evidence, setEvidence] = useState('');
  const [verifiedRole, setVerifiedRole] = useState('');
  const [challenge, setChallenge] = useState('');
  const [backup, setBackup] = useState('');
  const [matchGift, setMatchGift] = useState('');
  const sw = language === 'sw';
  const tr = (en: string, kiswahili: string) => sw ? kiswahili : en;
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateFormatters[sw ? 'sw' : 'en'].format(date);
  };
  const active = campaigns.find(campaign => campaign.id === campaignId) ?? campaigns[0];
  const selected = campaigns.find(campaign => campaign.id === intent) ?? campaigns[0];
  const report = state.reports[active.id];
  const approval = state.approved[active.id];
  const release = state.released[active.id];
  const totals = summarize(state);
  const pending = state.gifts.some(gift => gift.campaign === active.id && gift.status === 'pending');
  const canApprove = !approval && !pending && !state.unmatched && state.gifts.some(gift => gift.campaign === active.id && gift.status === 'confirmed');
  const protectedRole = role === 'Admin' || role === 'Finance';
  const pendingGift = state.gifts.find(gift => gift.campaign === intent && gift.status === 'pending');
  const confirmedGifts = state.gifts.filter(gift => gift.status === 'confirmed');
  const publishedEvidence = state.reports[evidenceCampaign.id];
  const evidenceDialog = useRef<HTMLDialogElement>(null);
  const writing = useRef(false);

  useEffect(() => {
    function load() {
      try { setState(readPilot()); setReady(true); }
      catch { setReady(false); setNotice({ section: 'page', message: 'Demo records could not be read in this browser.' }); }
    }
    const frame = requestAnimationFrame(load);
    function sync(event: StorageEvent) { if (event.key === pilotKey) load(); }
    window.addEventListener('storage', sync);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('storage', sync); };
  }, []);

  async function dispatch(action: Event) {
    if (!ready || writing.current) return;
    writing.current = true;
    const section = action.type === 'start' ? 'give' : action.type === 'payment' ? 'impact' : 'operations';
    function save() {
      const current = readPilot();
      const next = evolve(current, action, new Date().toISOString());
      if (next !== current) localStorage.setItem(pilotKey, JSON.stringify(next));
      return { next, changed: next !== current };
    }
    try {
      const { next, changed } = navigator.locks ? await navigator.locks.request(pilotKey, save) : save();
      setState(next);
      if (changed && action.type === 'start') {
        setOpenGift(action.id);
        window.location.hash = 'pilot-impact';
      }
      setNotice({
        section: changed && action.type === 'start' ? 'impact' : section,
        message: changed
          ? tr('Sample record saved in this browser.', 'Rekodi ya mfano imehifadhiwa kwenye kivinjari hiki.')
          : tr('The existing record was kept. Check the current status before trying again.', 'Rekodi iliyopo imehifadhiwa. Angalia hali yake kabla ya kujaribu tena.'),
      });
    } catch {
      setNotice({ section, message: tr('Could not save the sample record. Check browser storage and try again.', 'Rekodi haikuhifadhiwa. Angalia hifadhi ya kivinjari na ujaribu tena.') });
    } finally { writing.current = false; }
  }

  const languageControl = <div className="pilot-language-control">
    <label><span><Icon name="globe"/> {tr('Language', 'Lugha')}</span><select value={language} onChange={event => setLanguage(event.target.value)}><option value="en">English</option><option value="sw">Kiswahili</option></select></label>
  </div>;

  return <div className="pilot" lang={language}>
    {transparencyOnly ? <>
      <p className="pilot-status" role="status">{notice?.section === 'page' ? notice.message : ''}</p>
      {languageControl}
      <Link className="outline-button" href="/pilot">{tr('Open the giving pilot', 'Fungua onyesho la michango')} <Icon name="arrow-right"/></Link>
    </> : <>
    <p className="pilot-status" role="status">{notice?.section === 'page' ? notice.message : ''}</p>
    <div className="pilot-nav-row">
    <nav className="pilot-nav" aria-label={tr('Pilot sections', 'Sehemu za onyesho')}>
      <a href="#pilot-campaigns"><Icon name="search"/><span>{tr('Compare campaigns', 'Linganisha kampeni')}</span></a>
      <a href="#pilot-give"><Icon name="giving"/><span>{tr('Try a gift', 'Jaribu kuchangia')}</span></a>
      <a href="#pilot-impact"><Icon name="receipt"/><span>{tr('My impact', 'Matokeo yangu')}</span></a>
      <a href="#pilot-operations"><Icon name="platform"/><span>{tr('Workspaces', 'Sehemu za kazi')}</span></a>
      <Link href="/pilot/transparency"><Icon name="evidence"/><span>{tr('Transparency', 'Uwazi')}</span></Link>
    </nav>
    {languageControl}
    </div>
    <section id="pilot-campaigns" aria-labelledby="pilot-campaign-title">
      <h2 id="pilot-campaign-title">{tr('Compare campaign records', 'Linganisha rekodi za kampeni')}</h2>
      <div className="pilot-grid">
        {campaigns.map(campaign => {
          const latest = state.reports[campaign.id];
          const isExpired = expired(campaign);
          const isClosed = isExpired || !!state.approved[campaign.id];
          return <article className="pilot-card pilot-campaign" key={campaign.id}>
            <div className="pilot-campaign-media">
              <Image className="pilot-campaign-photo" src={campaign.image} alt="" width={640} height={280}
                sizes="(max-width: 760px) 100vw, (max-width: 1200px) 33vw, 380px"/>
              <div className="pilot-campaign-image-meta">
                <span className="pilot-campaign-reference">{campaign.id} · {campaign.place}</span>
                <span className="pilot-badge" data-tone={isExpired ? 'warning' : 'green'}>{isExpired ? tr('Review expired', 'Ukaguzi umeisha') : tr('Review current', 'Ukaguzi halali')}</span>
              </div>
              <div className="pilot-campaign-overlay">
                <h3>{sw ? campaign.sw : campaign.name}</h3>
                <p>{campaign.partner}</p>
              </div>
            </div>
            <div className="pilot-campaign-body">
            <dl className="pilot-facts">
              <div><dt>{tr('Giving type', 'Aina ya mchango')}</dt><dd>{campaign.fund}</dd></div>
              <div><dt>{tr('Demo fee', 'Ada ya mfano')}</dt><dd>{currency(0)}</dd></div>
              <div><dt>{tr('Last reviewed', 'Ilikaguliwa')}</dt><dd><time dateTime={campaign.checked}>{formatDate(campaign.checked)}</time></dd></div>
              <div><dt>{tr('Next update', 'Taarifa inayofuata')}</dt><dd><time dateTime={campaign.due}>{formatDate(campaign.due)}</time>{campaign.due < reportingDate && latest?.stage !== 'published' && <span className="pilot-badge" data-tone="warning">{tr('Overdue', 'Imechelewa')}</span>}</dd></div>
            </dl>
            <div className={`pilot-campaign-actions${isClosed ? ' is-closed' : ''}`}>
            <button className="outline-button pilot-evidence-trigger" type="button" aria-haspopup="dialog" aria-controls="pilot-evidence" onClick={() => {
              setEvidenceCampaign(campaign);
              evidenceDialog.current?.showModal();
            }}><Icon name="evidence"/>{tr('Verification and evidence', 'Ukaguzi na ushahidi')}</button>
            {!isClosed ? <a className="button" href="#pilot-give" onClick={() => setIntent(campaign.id)}>{tr('Choose this campaign', 'Chagua kampeni hii')} <Icon name="arrow-right"/></a>
              : <p className="pilot-campaign-closed"><Icon name="◷"/>{tr('Giving paused for this campaign', 'Michango ya kampeni hii imesitishwa')}</p>}
            </div>
            </div>
          </article>;
        })}
      </div>
      <dialog ref={evidenceDialog} id="pilot-evidence" className="pilot-card pilot-evidence" aria-labelledby="pilot-evidence-title">
        <form method="dialog" className="pilot-evidence-header">
          <p>{tr('Verification and evidence', 'Ukaguzi na ushahidi')} · {evidenceCampaign.id}</p>
          <button className="outline-button" aria-label={tr('Close verification', 'Funga ukaguzi')}><Icon name="close"/></button>
        </form>
        <h2 id="pilot-evidence-title">{sw ? evidenceCampaign.sw : evidenceCampaign.name}</h2>
        <p>{tr('Sample reviewers: organization vetting team and independent programme reviewer.', 'Wakaguzi wa mfano: timu ya uthibitishaji na mkaguzi huru wa mradi.')}</p>
        <p>{tr('Checked: registration, budget, intended fund and delivery plan.', 'Vilivyokaguliwa: usajili, bajeti, fungu na mpango wa utekelezaji.')}</p>
        <p>{tr('Review expires', 'Ukaguzi unaisha')} <time dateTime={evidenceCampaign.expires}>{formatDate(evidenceCampaign.expires)}</time>{evidenceCampaign.fund === 'Zakat' && <> · {tr('Sample Zakat policy', 'Sera ya mfano ya Zakat')} ZKT-3.2</>}</p>
        <ol className="pilot-timeline pilot-public-timeline" aria-label={tr('Public sample timeline', 'Mfuatano wa matukio ya mfano')}>
          <li><time dateTime={evidenceCampaign.checked}>{formatDate(evidenceCampaign.checked)}</time><span>{evidenceCampaign.latest}</span></li>
          <li><time dateTime={evidenceCampaign.due}>{formatDate(evidenceCampaign.due)}</time><span>{evidenceCampaign.milestone} · {publishedEvidence?.stage === 'published' ? tr('Published', 'Imechapishwa') : evidenceCampaign.delay}</span></li>
          {publishedEvidence?.stage === 'published' && <li><time dateTime={publishedEvidence.date}>{formatDate(publishedEvidence.date)}</time><span>{tr('The reviewer accepted the milestone evidence.', 'Mkaguzi alikubali ushahidi wa hatua hii.')}</span></li>}
        </ol>
      </dialog>
    </section>

    <div className="pilot-donor-grid">
    <section id="pilot-give" className="pilot-card" aria-labelledby="pilot-give-title">
      <h2 id="pilot-give-title">{tr('Try a guest gift', 'Jaribu kuchangia kama mgeni')}</h2>
      <p>{tr('Simulate M-PESA without a phone number. Your giving type is fixed by the campaign’s restricted fund.', 'Jaribu M-PESA bila nambari ya simu. Aina ya mchango hufuata fungu la kampeni.')}</p>
      <form className="pilot-form pilot-gift-form" onSubmit={event => {
        event.preventDefault();
        dispatch({ type: 'start', id: 'DEMO-' + crypto.randomUUID().slice(0, 12).toUpperCase(), campaign: intent, amount: Number(amount) });
      }}>
        <label>{tr('Campaign', 'Kampeni')}<select value={intent} onChange={event => setIntent(event.target.value)}>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{sw ? campaign.sw : campaign.name}</option>)}</select></label>
        <label>{tr('Amount (KSh)', 'Kiasi (KSh)')}<input required type="number" min="10" max="100000" step="1" value={pendingGift?.amount ?? amount} readOnly={!!pendingGift} onChange={event => setAmount(event.target.value)}/></label>
        <dl className="pilot-payment-summary">
          <div><dt>{tr('Giving type', 'Aina ya mchango')}</dt><dd>{selected.fund}</dd></div>
          <div><dt>{tr('Fee', 'Ada')}</dt><dd>{currency(0)}</dd></div>
          <div><dt>{tr('Total', 'Jumla')}</dt><dd>{currency(pendingGift?.amount ?? (Number(amount) || 0))}</dd></div>
        </dl>
        {pendingGift ? <a className="button" href="#pilot-impact" onClick={() => setOpenGift(pendingGift.id)}>{tr('Resume pending payment', 'Endelea na malipo yanayosubiri')}</a>
          : <button className="button" disabled={!ready || expired(selected) || !!state.approved[selected.id]}>{tr('Start sample payment', 'Anza malipo ya mfano')}</button>}
      </form>
      <p className="pilot-status" role="status">{notice?.section === 'give' ? notice.message : ''}</p>
      {(expired(selected) || state.approved[selected.id]) && <p className="pilot-badge" data-tone="warning">{tr('This campaign is closed to new sample gifts.', 'Kampeni hii imefungwa kwa michango mipya ya mfano.')}</p>}
    </section>

    <section id="pilot-impact" className="pilot-card" aria-labelledby="pilot-impact-title">
      <h2 id="pilot-impact-title">{tr('My impact and receipts', 'Matokeo na risiti zangu')}</h2>
      <p>{tr('Your sample gifts on this device. Open a record to review its status, simulate a payment result or get a receipt.', 'Michango yako ya mfano kwenye kifaa hiki. Fungua rekodi kuona hali, kujaribu matokeo ya malipo au kupata risiti.')}</p>
      <p className="pilot-status" role="status">{notice?.section === 'impact' ? notice.message : ''}</p>
      {!state.gifts.length && <div className="pilot-empty"><Icon name="receipt"/><p>{tr('Your first sample gift will appear here.', 'Mchango wako wa kwanza wa mfano utaonekana hapa.')}</p></div>}
      {[...state.gifts].reverse().map(gift => {
        const name = campaigns.find(item => item.id === gift.campaign);
        const approved = state.approved[gift.campaign];
        const released = state.released[gift.campaign];
        const delivery = state.reports[gift.campaign];
        const dates = [gift.confirmed, gift.confirmed, approved, released, delivery?.delivered, delivery?.stage === 'published' ? delivery.date : undefined];
        return <details className="pilot-gift" key={gift.id} open={openGift === gift.id} onToggle={event => {
          if (event.currentTarget.open) setOpenGift(gift.id);
          else setOpenGift(current => current === gift.id ? '' : current);
        }}>
          <summary><span className="pilot-gift-heading"><span><strong>{currency(gift.amount)}</strong> · {sw ? name?.sw : name?.name}</span><span className="pilot-badge" data-tone={{ confirmed: 'green', pending: 'warning', failed: 'error', reversed: 'neutral' }[gift.status]}>{statusLabel[gift.status][sw ? 1 : 0]}</span></span></summary>
          <p className="pilot-gift-reference">{gift.id} · {gift.fund} · <time dateTime={gift.updated}>{formatDate(gift.updated)}</time></p>
          {gift.status === 'pending' && <>
            <p>{tr('Waiting for confirmation. Reopen this page to check status before trying again.', 'Inasubiri uthibitisho. Fungua ukurasa huu tena kuona hali kabla ya kujaribu tena.')}</p>
            <div className="pilot-actions">
              <button className="button" onClick={() => dispatch({ type: 'payment', id: gift.id, status: 'confirmed' })}>{tr('Simulate confirmation', 'Jaribu uthibitisho')}</button>
              <button className="outline-button" onClick={() => dispatch({ type: 'payment', id: gift.id, status: 'failed' })}>{tr('Simulate failure', 'Jaribu malipo yaliyoshindwa')}</button>
            </div>
          </>}
          {gift.status === 'failed' && <a href="#pilot-give" className="outline-button" onClick={() => { setIntent(gift.campaign); setAmount(String(gift.amount)); }}>{tr('Start a new attempt', 'Anza jaribio jipya')}</a>}
          {gift.status === 'confirmed' && <>
            <ol className="pilot-timeline pilot-receipt-timeline" aria-label={tr('Gift milestones', 'Hatua za mchango')}>
              {milestones.map((milestone, index) => {
                const date = dates[index];
                return <li key={milestone} data-complete={!!date}>
                  <Icon name={date ? 'check' : '◷'}/>
                  <span>{sw ? timelineSw[index] : milestone}</span>
                  {date ? <time dateTime={date}>{formatDate(date)}</time> : <span className="pilot-pending">{tr('Pending', 'Inasubiri')}</span>}
                </li>;
              })}
            </ol>
            <div className="pilot-actions">
              <button className="outline-button" onClick={() => downloadText(gift.id + '.txt', [tr('AMANAH GIVING · SAMPLE RECEIPT', 'AMANAH GIVING · RISITI YA MFANO'), gift.id, tr('Confirmed', 'Imethibitishwa') + ' ' + gift.confirmed, sw ? name?.sw : name?.name, gift.fund, currency(gift.amount), tr('Fee', 'Ada') + ' ' + currency(0), tr('Simulated payment only.', 'Haya ni malipo ya mfano tu.')].join('\n'))}><Icon name="download"/>{tr('Download sample receipt', 'Pakua risiti ya mfano')}</button>
              {!approved && <button className="outline-button" onClick={() => dispatch({ type: 'payment', id: gift.id, status: 'reversed' })}>{tr('Simulate reversal', 'Jaribu kurejesha malipo')}</button>}
            </div>
          </>}
          {gift.status === 'reversed' && <p>{tr('The sample amount was returned. This record has no active receipt.', 'Kiasi cha mfano kilirejeshwa. Rekodi hii haina risiti inayotumika.')}</p>}
        </details>;
      })}
      <details><summary>{tr('Payment help', 'Msaada wa malipo')}</summary><p>{tr('Keep the reference number. If a payment is pending, check its status first. For this demo, choose an outcome inside the sample gift.', 'Hifadhi nambari ya kumbukumbu. Malipo yakisubiri, angalia hali yake kwanza. Kwenye onyesho hili, chagua matokeo ndani ya rekodi ya mchango.')}</p></details>
    </section>
    </div>

    <section id="pilot-operations" className="pilot-card" aria-labelledby="pilot-ops-title">
      <h2 id="pilot-ops-title">Pilot workspaces</h2>
      <details><summary>Walk through a complete sample gift</summary>
        <ol className="pilot-timeline pilot-steps">
          <li>Start and confirm a gift in My impact.</li>
          <li>In Finance, flag and match the sample duplicate to your confirmed gift.</li>
          <li>In Admin, approve the release. Return to Finance to record the release.</li>
          <li>In Organization, open the evidence request and send a fictional summary for review.</li>
          <li>In Admin, publish the redacted update. Check My impact and Transparency for the result.</li>
        </ol>
      </details>
      <div className="pilot-roles" role="group" aria-label="Choose a sample role">
        {roles.map(([label, icon]) => (
          <button type="button" key={label} className="outline-button" aria-pressed={role === label} aria-controls="pilot-role-panel" onClick={() => {
            if (label === role) return;
            setRole(label);
            setVerifiedRole('');
            setChallenge('');
            setEvidence('');
            setNotice(current => current?.section === 'operations' ? null : current);
          }}><Icon name={icon}/><span>{label}</span></button>
        ))}
      </div>
      <div id="pilot-role-panel" className="pilot-role-panel" role="region" aria-label={`${role} workspace`}>
      <div className="pilot-workspace-context">
      <label className="pilot-select">Shared campaign<select value={campaignId} onChange={event => { setCampaignId(event.target.value); setEvidence(''); }}>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
      <p className="pilot-workspace-reference"><Icon name="platform"/><span>{active.id} · {active.fund} · {active.partner}</span></p>
      </div>
      <p className="pilot-status" role="status">{notice?.section === 'operations' ? notice.message : ''}</p>
      {protectedRole && verifiedRole !== role ? <form className="pilot-form" onSubmit={event => {
        event.preventDefault();
        if (challenge.trim() === '246810') {
          setVerifiedRole(role);
          setNotice({ section: 'operations', message: 'Sample second-step check completed.' });
        } else setNotice({ section: 'operations', message: 'Use the displayed sample code.' });
      }}>
        <label>Sample second step (code 246810)<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={challenge} onChange={event => setChallenge(event.target.value)}/></label>
        <button className="button">Unlock {role} demo</button>
      </form> : <>
        {role === 'Donor' && <div className="pilot-workflow"><h3>Donor activity</h3><p><strong>{state.gifts.length}</strong> sample {state.gifts.length === 1 ? 'gift' : 'gifts'} recorded on this device.</p></div>}
        {role === 'Beneficiary' && <p>Private delivery case · {active.id} · {report?.stage === 'published' ? 'Delivery recorded and reviewed' : 'Waiting for reviewed delivery evidence'}. The public timeline uses the campaign reference.</p>}
        {role === 'Shariah' && <p>{active.fund === 'Zakat' ? 'Sample policy ZKT-3.2 · Eligibility and restricted allocation recorded for this campaign.' : active.fund + ' campaign · This fund does not accept Zakat in the pilot.'} <Link className="text-link" href="/policies">Read Amanah’s policies</Link></p>}
        {role === 'Finance' && <div className="pilot-workflow">
          <h3>Payment reconciliation</h3>
          <p>{state.unmatched ? 'Unmatched callback DEMO-MP-001 needs review. Match it after confirming a sample gift.' : state.matched ? 'Duplicate confirmation reviewed. The original receipt was retained.' : 'No unmatched payments.'}</p>
          {state.unmatched && <label className="pilot-select">Confirmed gift to match
            <select value={matchGift} onChange={event => setMatchGift(event.target.value)}>
              <option value="">Choose a sample payment</option>
              {confirmedGifts.map(gift => <option key={gift.id} value={gift.id}>{gift.id} · {gift.campaign} · {currency(gift.amount)}</option>)}
            </select>
          </label>}
          <div className="pilot-actions">
            <button className="outline-button" disabled={!ready || state.unmatched || state.matched} onClick={() => dispatch({ type: 'flag' })}>Simulate unmatched callback</button>
            <button className="button" disabled={!ready || !state.unmatched || !confirmedGifts.some(gift => gift.id === matchGift)} onClick={() => dispatch({ type: 'reconcile', id: matchGift })}>Resolve duplicate callback</button>
            <button className="outline-button" disabled={!ready || !approval || !!release || state.unmatched} onClick={() => dispatch({ type: 'release', campaign: active.id })}>Record approved release</button>
          </div>
          {release && <p>Sample release recorded on {release.slice(0, 10)}.</p>}
        </div>}
        {role === 'Admin' && <div className="pilot-workflow">
          <h3>Release and evidence review</h3>
          <p>{approval ? 'Restricted release approved.' : 'Release requires a confirmed gift, no pending attempts on this campaign and a clear reconciliation queue.'}</p>
          <div className="pilot-actions">
            <button className="button" disabled={!ready || !canApprove} onClick={() => dispatch({ type: 'approve', campaign: active.id })}>Approve sample release</button>
            <button className="outline-button" disabled={!ready || report?.stage !== 'submitted'} onClick={() => dispatch({ type: 'changes', campaign: active.id })}>Request evidence changes</button>
            <button className="outline-button" disabled={!ready || !release || report?.stage !== 'submitted'} onClick={() => dispatch({ type: 'publish', campaign: active.id })}>Publish redacted update</button>
          </div>
          {report?.evidence && <p>Private sample evidence: {report.evidence}</p>}
        </div>}
        {role === 'Organization' && <div className="pilot-workflow">
          <h3>Partner reporting inbox</h3>
          <p>{active.milestone} · Due {active.due} · {report?.stage ?? 'No evidence requested'}</p>
          <button className="outline-button" disabled={!ready || !!report} onClick={() => dispatch({ type: 'request', campaign: active.id })}>Open scheduled evidence request</button>
          {(report?.stage === 'requested' || report?.stage === 'changes') && !release && <p>Evidence can be submitted after Finance records the approved release.</p>}
          {release && (report?.stage === 'requested' || report?.stage === 'changes') && <form className="pilot-form" onSubmit={event => {
            event.preventDefault(); dispatch({ type: 'submit', campaign: active.id, evidence });
          }}>
            <label>Sample evidence summary<textarea required maxLength={500} value={evidence} onChange={event => setEvidence(event.target.value)} placeholder="Use fictional details only"/></label>
            <button className="button" disabled={!evidence.trim()}>Send for review</button>
          </form>}
        </div>}
      </>}
      </div>
      <div className="pilot-operator-tools">
      <details><summary>Sample audit trail</summary>{state.audit.length ? <ol className="pilot-timeline pilot-audit">{state.audit.map((entry, index) => <li key={index}><span>{entry.event}</span><time dateTime={entry.date}>{formatDate(entry.date)}</time></li>)}</ol> : <p>Sample activity will appear here.</p>}</details>
      <details><summary>Recovery and privacy rehearsal</summary>
        <p>Sample operator exercise. Export a recovery snapshot, verify its totals in a dry run, and check that private evidence stays out of public reports.</p>
        <div className="pilot-actions">
          <button className="outline-button" onClick={() => { const snapshot = JSON.stringify(state); setBackup(snapshot); downloadText('amanah-pilot-snapshot.json', snapshot); }}>Export sample backup</button>
          <button className="outline-button" disabled={!backup} onClick={() => { const saved = JSON.parse(backup) as Pilot; setNotice({ section: 'recovery', message: `Recovery dry run: ${saved.gifts.length} gifts restored to a test copy, ${currency(summarize(saved).held)} held.` }); }}>Run restore dry run</button>
        </div>
        <p className="pilot-status" role="status">{notice?.section === 'recovery' ? notice.message : ''}</p>
        <ol className="pilot-timeline pilot-steps"><li>Pause the affected workflow and identify its last reconciled reference.</li><li>Restore a copy and compare receipt IDs, balances and audit events.</li><li>Record the outcome and review access, retention and disclosure with the responsible team.</li></ol>
      </details>
      </div>
    </section></>}

    <section id="pilot-transparency" className="pilot-card" aria-labelledby="pilot-transparency-title">
      <h2 id="pilot-transparency-title">{tr('Transparency report', 'Ripoti ya uwazi')}</h2>
      <p>{tr('Demo reporting period: all sample activity on this browser. Held funds equal confirmed principal minus recorded releases and reversals. Pending and failed payments are excluded.', 'Kipindi cha mfano: shughuli zote kwenye kivinjari hiki. Salio ni michango iliyothibitishwa ukiondoa fedha zilizotolewa na marejesho. Malipo yanayosubiri au yaliyoshindwa hayajumuishwi.')}</p>
      <dl className="pilot-totals">
        {[[tr('Received', 'Zilizopokelewa'), totals.received], [tr('Released', 'Zilizotolewa'), totals.released], [tr('Returned', 'Zilizorejeshwa'), totals.returned], [tr('Held', 'Zilizoshikiliwa'), totals.held]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{currency(Number(value))}</dd></div>)}
      </dl>
      <dl className="pilot-health">
        <div><dt>{tr('Unresolved payment exceptions', 'Hitilafu za malipo ambazo hazijatatuliwa')}</dt><dd>{Number(state.unmatched)}</dd></div>
        <div><dt>{tr('Overdue sample reports', 'Ripoti za mfano zilizochelewa')}</dt><dd>{campaigns.filter(campaign => campaign.due < reportingDate && state.reports[campaign.id]?.stage !== 'published').length}</dd></div>
        <div><dt>{tr('Duplicate receipts', 'Risiti zilizorudiwa')}</dt><dd>{state.gifts.filter(gift => gift.confirmed).length - new Set(state.gifts.filter(gift => gift.confirmed).map(gift => gift.id)).size}</dd></div>
      </dl>
      <Link className="outline-button" href="/hajj#hajj-sponsorship"><Icon name="kaaba"/>Amanah Hajj · {tr('Separate sponsorship demo', 'Onyesho tofauti la ufadhili')}</Link>
    </section>
  </div>;
}
