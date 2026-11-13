'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Icon from '../Icon';
import { downloadText } from '../givingDrafts';
import { academy, addAudit, demoKey, documentItems, emptyDemo, formatKes, funds, milestones, parseDemo, paymentMethods, reconciledTotal, sampleDocuments, sampleExpenses, sampleQuote, type Application, type Demo, type FundId } from './demoData';
import HajjTools from './HajjTools';

const nextActions = ['Approve sample application', 'Authorise sample funding', 'Confirm preparation', 'Confirm sample return', 'Reconcile sample expenses'];
const sections = [
  ['sponsorship', 'giving', 'Sponsor'],
  ['application', 'receipt', 'Apply for support'],
  ['journey', 'calendar', 'My journey'],
  ['academy', 'book', 'Hajj Academy'],
  ['circles', 'users', 'Circles and pledges'],
  ['assistance', 'support', 'Assistance'],
  ['future', 'wallet', 'Savings and Umrah'],
] as const;

export default function HajjDemo() {
  const [demo, setDemo] = useState(emptyDemo);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [activeFund, setActiveFund] = useState<FundId | null>(null);
  const [amount, setAmount] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [method, setMethod] = useState<typeof paymentMethods[number]>('M-PESA');
  const [paymentOutcome, setPaymentOutcome] = useState('success');
  const [review, setReview] = useState(false);
  const [notice, setNotice] = useState('');
  const [oversight, setOversight] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [demoRun, setDemoRun] = useState(0);
  const [academyLanguage, setAcademyLanguage] = useState<'en' | 'sw'>('en');
  const giftForm = useRef<HTMLFormElement>(null);
  const giftHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setDemo(parseDemo(localStorage.getItem(demoKey))); }
      catch { setStorageAvailable(false); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function updateDemo(change: (current: Demo) => Demo) {
    let current = demo;
    try {
      if (storageAvailable) current = parseDemo(localStorage.getItem(demoKey));
    } catch { /* Use the current session if the stored copy could not be read. */ }
    const next = change(current);
    try { localStorage.setItem(demoKey, JSON.stringify(next)); }
    catch { setStorageAvailable(false); }
    setDemo(next);
  }

  const selected = funds.find(fund => fund.id === activeFund);
  const giftAmount = Number(amount);
  const application = demo.application;
  const { extras } = demo;
  const { cancelled, documents, audit } = extras;
  const reviewBlocked = application?.stage === 0 ? documents.length < documentItems.length : application?.stage === 1 ? !extras.booking : application?.stage === 2 && demo.checklist.length < academy.length;
  const paid = (fund: FundId, state = demo) => state.gifts.filter(gift => gift.fund === fund).reduce((total, gift) => total + gift.amount, 0);

  function saveGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !Number.isSafeInteger(giftAmount) || giftAmount < 1 || giftAmount > selected.target - selected.raised - paid(selected.id)) return;
    if (!review) {
      setReview(true);
      requestAnimationFrame(() => giftHeading.current?.focus());
      return;
    }
    if (paymentOutcome === 'declined') {
      setNotice(`${method} declined the sample payment. The fund balance is unchanged. Choose success to retry.`);
      document.getElementById('hajj-gift-status')?.focus();
      return;
    }
    const gift = { id: `HAJ-G-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, fund: selected.id, amount: giftAmount, anonymous, method };
    let saved = false;
    updateDemo(current => {
      if (gift.amount > selected.target - selected.raised - paid(selected.id, current)) return current;
      saved = true;
      return { ...current, gifts: [gift, ...current.gifts] };
    });
    setNotice(saved ? `${formatKes(gift.amount)} added to ${selected.name}. Demo reference ${gift.id}.` : 'The remaining balance changed. Choose a lower amount or another fund.');
    setReview(false);
    if (saved) { setActiveFund(null); setAmount(''); }
    document.getElementById('hajj-gift-status')?.focus();
  }

  function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const path = form.get('path');
    const scenario = form.get('scenario');
    if ((path !== 'community' && path !== 'family') || (scenario !== 'first-time' && scenario !== 'accessibility')) return;
    const entry: Application = { id: `HAJ-A-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, path, scenario, stage: 0 };
    updateDemo(current => current.application ? current : { ...current, application: entry, extras: addAudit(current.extras, milestones[0]) });
    document.getElementById('hajj-application-status')?.focus();
  }

  function advance() {
    updateDemo(current => {
      const entry = current.application;
      if (!entry || current.extras.cancelled || entry.stage !== application?.stage || entry.stage >= milestones.length - 1) return current;
      if (entry.stage === 0 && current.extras.documents.length < documentItems.length) return current;
      if (entry.stage === 1 && !current.extras.booking) return current;
      if (entry.stage === 2 && current.checklist.length < academy.length) return current;
      const stage = entry.stage + 1;
      return { ...current, application: { ...entry, stage }, extras: addAudit(current.extras, milestones[stage]) };
    });
  }

  return (
    <>
      <p className="hajj-preview"><Icon name="shield"/><span><strong>Interactive demo</strong><span>Explore with sample records, simulated payments and bookings. {storageAvailable ? 'Progress is saved in this browser.' : 'Progress lasts for this visit because browser storage is unavailable.'}</span></span></p>
      <nav className="hajj-jump" aria-label="Amanah Hajj sections">
        {sections.map(([id, icon, label]) => <a key={id} href={`#hajj-${id}`}><Icon name={icon}/><span>{label}</span></a>)}
      </nav>

      <section id="hajj-sponsorship" aria-labelledby="hajj-sponsor-title">
        <h2 id="hajj-sponsor-title">Choose a sponsorship</h2>
        <div className="hajj-paths hajj-funds">
          {funds.map(fund => {
            const total = fund.raised + paid(fund.id);
            return <article className="hajj-path" key={fund.id}>
              <div className="hajj-icon"><Icon name={fund.icon}/></div>
              <h3>{fund.name}</h3><p>{fund.description}</p><small className="hajj-reference">{fund.reference} · Sample fund</small>
              <div className="hajj-funding">
                <div className="hajj-funding-summary"><div><strong>{formatKes(total)}</strong><small>of {formatKes(fund.target)}</small></div><span>{Math.floor(total / fund.target * 100)}% funded</span></div>
                <progress id={`hajj-fund-${fund.id}`} aria-label={`${fund.name} sample funding`} value={total} max={fund.target}/>
              </div>
              <button id={`hajj-sponsor-${fund.id}`} className="outline-button" type="button" disabled={!ready || total >= fund.target} aria-pressed={activeFund === fund.id} onClick={() => {
                setActiveFund(fund.id); setAmount(''); setAnonymous(true); setMethod('M-PESA'); setPaymentOutcome('success'); setReview(false); setNotice('');
                requestAnimationFrame(() => giftForm.current?.querySelector('input')?.focus());
              }}>{total >= fund.target ? 'Target reached' : 'Try a contribution'} <Icon name="arrow-right"/><span className="sr-only"> to {fund.name}</span></button>
            </article>;
          })}
        </div>
        <p id="hajj-gift-status" className="hajj-status" role="status" tabIndex={-1}>{notice}</p>
        {selected && <form className="hajj-path hajj-form" ref={giftForm} onSubmit={saveGift}>
          <h3 ref={giftHeading} tabIndex={-1}>{review ? 'Review demo contribution' : selected.name}</h3>
          {review ? <><p><strong>{formatKes(giftAmount)}</strong> · {selected.name} · Sadaqah · {method} simulation{anonymous ? ' · Anonymous' : ''}</p><label>Simulated payment outcome<select value={paymentOutcome} onChange={event => setPaymentOutcome(event.target.value)}><option value="success">Successful</option><option value="declined">Declined</option></select></label></> : <>
            <label>Amount in KSh<input type="number" name="amount" value={amount} onChange={event => setAmount(event.target.value)} required min={1} max={selected.target - selected.raised - paid(selected.id)} step={1} inputMode="numeric"/></label>
            <label>Sample payment method<select value={method} onChange={event => setMethod(paymentMethods.find(item => item === event.target.value) ?? 'M-PESA')}>{paymentMethods.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className="hajj-check"><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)}/>Keep my demo contribution anonymous</label>
          </>}
          <div className="hajj-actions"><button className="button" type="submit">{review ? 'Confirm demo contribution' : 'Review contribution'}</button><button className="text-link" type="button" onClick={() => {
            if (review) {
              setReview(false);
              requestAnimationFrame(() => giftForm.current?.querySelector('input')?.focus());
            } else {
              setActiveFund(null);
              document.getElementById(`hajj-sponsor-${selected.id}`)?.focus();
            }
          }}>{review ? 'Edit amount' : 'Cancel'}</button></div>
        </form>}
        {demo.gifts.length > 0 && <details className="hajj-ledger"><summary>My demo contributions ({demo.gifts.length})</summary><ul>
          {demo.gifts.map(gift => <li key={gift.id}><span><strong>{funds.find(fund => fund.id === gift.fund)?.name}</strong><small>{gift.id} · Sadaqah{gift.method ? ` · ${gift.method} simulation` : ''}{gift.anonymous ? ' · Anonymous' : ''}</small></span><b>{formatKes(gift.amount)}</b></li>)}
        </ul></details>}
      </section>

      <div className="hajj-applicant-grid">
      <section className="hajj-journey" id="hajj-application" aria-labelledby="hajj-apply-title">
        <h2 id="hajj-apply-title">Try applying for Hajj support</h2>
        <p role="status" className="hajj-status" id="hajj-application-status" tabIndex={-1}>{application ? `Sample application ${application.id} is saved. Follow its progress in My journey.` : 'Choose a sample applicant profile. The demo uses preset details.'}</p>
        {application ? <a className="text-link hajj-inline-link" href="#hajj-journey">Go to My journey <Icon name="arrow-right"/></a> : <form className="hajj-form" onSubmit={saveApplication}>
          <div className="hajj-fields">
            <label>Sponsorship route<select name="path"><option value="community">Community sponsorship</option><option value="family">Family Hajj Circle</option></select></label>
            <label>Sample profile<select name="scenario"><option value="first-time">First-time pilgrim seeking support</option><option value="accessibility">First-time pilgrim with accessibility needs</option></select></label>
          </div>
          <button className="button" type="submit" disabled={!ready}>Save sample application</button>
        </form>}
      </section>

      <section className="hajj-journey" id="hajj-journey" aria-labelledby="hajj-journey-title">
        <h2 id="hajj-journey-title">My journey</h2>
        {application ? <p>{`${application.id} · ${application.path === 'family' ? 'Family Hajj Circle' : 'Community sponsorship'} · ${application.scenario === 'accessibility' ? 'Accessibility support' : 'First-time pilgrim'}`}</p> : <div className="hajj-journey-empty"><div className="hajj-icon"><Icon name="calendar"/></div><div><h3>No sample application yet</h3><p>Save one to follow your milestones and try programme review.</p><a className="text-link hajj-inline-link" href="#hajj-application">Go to application <Icon name="arrow-right"/></a></div></div>}
        {application && <>
          <ol className="hajj-milestones" aria-label="Sample journey milestones">
            {milestones.map((label, index) => <li key={label} aria-current={index === application.stage ? 'step' : undefined}>
              <div className="hajj-icon"><Icon name={index <= application.stage ? 'check' : '◷'}/></div><div><h3>{label}</h3><p>{index < application.stage ? 'Recorded' : index === application.stage ? 'Latest milestone' : 'Pending'}</p></div>
            </li>)}
          </ol>
          <p className="hajj-status" role="status">Journey status · {cancelled ? 'Cancelled booking · review required' : milestones[application.stage]}</p>
          {cancelled ? <div className="hajj-review">
            {extras.resolution ? <p role="status">Sample disposition recorded · {extras.resolution === 'refund' ? 'Refund approved' : 'Reassignment approved'}. No funds moved.</p> : <>
              <p>The sample case is paused. Its balance stays restricted pending a documented disposition.</p>
              <div className="hajj-actions">{(['refund', 'reassign'] as const).map(resolution => <button key={resolution} type="button" className="outline-button" onClick={() => updateDemo(current => !current.extras.cancelled || current.extras.resolution ? current : { ...current, extras: addAudit({ ...current.extras, resolution }, resolution === 'refund' ? 'Sample refund approved' : 'Sample reassignment approved') })}>{resolution === 'refund' ? 'Approve sample refund' : 'Approve sample reassignment'}</button>)}</div>
            </>}
          </div> : application.stage < milestones.length - 1 ? <div className="hajj-review">
            <button className="outline-button" type="button" aria-expanded={oversight} aria-controls="hajj-oversight" onClick={() => setOversight(!oversight)}><Icon name="shield"/>{oversight ? 'Hide programme review' : 'Try programme review'}</button>
            <div id="hajj-oversight" hidden={!oversight}>
              <p>Reviewer simulation · Sample quotation {formatKes(sampleQuote)}. This case is separate from the sponsorship examples above.</p>
              {application.stage === 0 && <fieldset className="hajj-documents"><legend>Sample verification checklist</legend>
                {documentItems.map((item, index) => <div className="hajj-sample-document" key={item}>
                  <details><summary>{sampleDocuments[index][0]}</summary><p>{sampleDocuments[index][1]}</p></details>
                  {!extras.attached.includes(index) && !documents.includes(index) && <button type="button" className="outline-button" aria-label={`Attach ${sampleDocuments[index][0]}`} onClick={() => updateDemo(current => current.application?.stage !== 0 || current.extras.attached.includes(index) ? current : { ...current, extras: addAudit({ ...current.extras, attached: [...current.extras.attached, index] }, `${sampleDocuments[index][0]} attached`) })}>Attach sample</button>}
                  <label className="hajj-check"><input type="checkbox" disabled={!extras.attached.includes(index) && !documents.includes(index)} checked={documents.includes(index)} onChange={event => {
                  const checked = event.target.checked;
                  updateDemo(current => current.application?.stage !== 0 ? current : { ...current, extras: { ...current.extras, documents: checked ? [...new Set([...current.extras.documents, index])] : current.extras.documents.filter(value => value !== index) } });
                }}/>{item}</label></div>)}
                <p>{documents.length} of {documentItems.length} reviewed. A reviewer approves the sample case.</p>
              </fieldset>}
              {application.stage === 1 && <div className="hajj-sample-document">
                <p>Provider booking sandbox · Sample authorised partner · Quote DEMO-Q104 · {formatKes(sampleQuote)}</p>
                {extras.booking ? <p role="status">Reservation DEMO-B104 held in the sandbox.</p> : <button type="button" className="outline-button" onClick={() => updateDemo(current => current.application?.stage !== 1 || current.extras.booking ? current : { ...current, extras: addAudit({ ...current.extras, booking: true }, 'Sample provider reservation created') })}>Create sample reservation</button>}
              </div>}
              {application.stage === 2 && demo.checklist.length < academy.length && <p><a className="text-link" href="#hajj-academy">Finish the Academy checklist</a> to confirm preparation.</p>}
              {application.stage === 3 && <p>Confirm the sample pilgrim’s welfare and safe return before closing the journey.</p>}
              {application.stage === 4 && <p>Review the expense breakdown below before recording reconciliation.</p>}
              <div className="hajj-actions"><button className="button" type="button" disabled={reviewBlocked} onClick={advance}>{nextActions[application.stage]}</button>
              {application.stage >= 2 && application.stage <= 3 && <button className="text-link" type="button" onClick={() => updateDemo(current => current.application?.stage !== application.stage || current.extras.cancelled ? current : { ...current, extras: addAudit({ ...current.extras, cancelled: true }, 'Sample booking cancelled') })}>Simulate failed booking</button>}</div>
            </div>
          </div> : <button className="outline-button" type="button" onClick={() => downloadText(`${application.id}-impact-report.txt`, ['AMANAH HAJJ — SAMPLE IMPACT REPORT', application.id, `Sponsorship path: ${application.path === 'family' ? 'Family Hajj Circle' : 'Community sponsorship'}`, `Illustrative quotation: ${formatKes(sampleQuote)}`, ...sampleExpenses.map(item => `${item.label}: ${formatKes(item.amount)}`), `Reconciled expenses: ${formatKes(reconciledTotal)}`, `Unused restricted balance: ${formatKes(sampleQuote - reconciledTotal)}`, ...milestones, 'Demo record only. No payment, booking or real pilgrim data.'].join('\n'))}><Icon name="download"/>Download sample impact report</button>}
          {!cancelled && application.stage >= 2 && <details className="hajj-ledger" open={application.stage >= 4}><summary>Sample funding and expense record</summary><ul>
            {extras.booking && <li><span>Provider booking</span><b>DEMO-B104 · Confirmed</b></li>}
            <li><span>Approved funding</span><b>{formatKes(sampleQuote)}</b></li>
            {application.stage >= 4 && <>{sampleExpenses.map(item => <li key={item.label}><span>{item.label}</span><b>{formatKes(item.amount)}</b></li>)}<li><span>Unused restricted balance</span><b>{formatKes(sampleQuote - reconciledTotal)}</b></li></>}
          </ul></details>}
          {audit.length > 0 && <details className="hajj-ledger"><summary>Programme audit trail ({audit.length})</summary><ul>{audit.map((entry, index) => <li key={`${entry.date}-${index}`}><span>{entry.action}</span><time dateTime={entry.date}>{new Date(entry.date).toLocaleString('en-KE')}</time></li>)}</ul></details>}
        </>}
      </section>
      </div>

      <section className="hajj-journey" id="hajj-academy" aria-labelledby="hajj-academy-title">
        <div className="hajj-academy-head">
          <div><h2 id="hajj-academy-title">Hajj Academy</h2><p aria-live="polite">{demo.checklist.length} of {academy.length} preparation steps complete</p></div>
          <label className="hajj-form hajj-language">Academy language<select value={academyLanguage} onChange={event => setAcademyLanguage(event.target.value === 'sw' ? 'sw' : 'en')}><option value="en">English</option><option value="sw">Kiswahili</option></select></label>
        </div>
        <div className="hajj-academy">
          {academy.map(({ title, detail, sw }, index) => <div key={title} data-complete={demo.checklist.includes(index)}>
            <details lang={academyLanguage}><summary>{academyLanguage === 'sw' ? sw.title : title}</summary><p>{academyLanguage === 'sw' ? sw.detail : detail}</p></details>
            <label className="hajj-check"><input type="checkbox" checked={demo.checklist.includes(index)} disabled={!ready} onChange={event => {
              const checked = event.target.checked;
              updateDemo(current => ({ ...current, checklist: checked ? [...new Set([...current.checklist, index])] : current.checklist.filter(item => item !== index) }));
            }}/><span>Mark complete<span className="sr-only">: {title}</span></span></label>
          </div>)}
        </div>
      </section>
      <HajjTools key={demoRun} extras={extras} ready={ready} hasApplication={!!application} update={change => updateDemo(current => ({ ...current, extras: change(current.extras) }))}/>
      {Boolean(demo.gifts.length || application || demo.checklist.length || extras.circle || extras.pledges.length || extras.savings || extras.umrah) && (
        <div className="hajj-demo-settings">
          {resetOpen ? <><p>Clear all Amanah Hajj demo progress in this browser?</p><div className="hajj-actions">
            <button className="outline-button" type="button" onClick={() => {
              updateDemo(() => emptyDemo);
              setActiveFund(null); setReview(false); setOversight(false); setResetOpen(false);
              setDemoRun(run => run + 1); setAcademyLanguage('en');
              setNotice('Demo reset. You can try another sponsorship or application.');
              document.getElementById('hajj-gift-status')?.focus();
            }}>Confirm reset</button>
            <button className="text-link" type="button" onClick={() => setResetOpen(false)}>Keep demo progress</button>
          </div></> : <button className="text-link" type="button" onClick={() => setResetOpen(true)}>Reset Hajj demo</button>}
        </div>
      )}
    </>
  );
}
