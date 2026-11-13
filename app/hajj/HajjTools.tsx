'use client';

import { useState, type FormEvent } from 'react';
import Icon from '../Icon';
import { addAudit, documentItems, formatKes, frequencies, funds, validAmount, type Extras, type FundId } from './demoData';

type Props = { extras: Extras; ready: boolean; hasApplication: boolean; update: (change: (extras: Extras) => Extras) => void };

export default function HajjTools({ extras, ready, hasApplication, update }: Props) {
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [question, setQuestion] = useState('documents');
  const [answered, setAnswered] = useState('');
  const [feedback, setFeedback] = useState('');

  function savePledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fund = funds.find(item => item.id === form.get('fund'))?.id;
    const amount = Number(form.get('amount'));
    const frequency = frequencies.find(item => item === form.get('frequency'));
    if (!fund || !frequency || !validAmount(amount)) return;
    update(current => ({ ...current, pledges: [...current.pledges.filter(item => item.fund !== fund), { fund, amount, frequency }] }));
    setFeedback('Demo pledge saved. No automatic payment is scheduled.');
  }

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = Number(new FormData(event.currentTarget).get('target'));
    if (!validAmount(target)) return;
    update(current => ({ ...current, savings: { target, saved: Math.min(current.savings?.saved ?? 0, target) } }));
    setFeedback('Sample savings target saved.');
  }

  function logSavings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    if (!validAmount(amount)) return;
    update(current => current.savings && amount <= current.savings.target - current.savings.saved ? { ...current, savings: { ...current.savings, saved: current.savings.saved + amount } } : current);
    event.currentTarget.reset();
  }

  function removePledge(fund: FundId) {
    update(current => ({ ...current, pledges: current.pledges.filter(item => item.fund !== fund) }));
  }

  return <>
    <section id="hajj-circles" className="hajj-journey" aria-labelledby="hajj-circles-title">
      <h2 id="hajj-circles-title">Family circles and recurring pledges</h2>
      <div className="hajj-tools-grid">
        <article className="hajj-path">
          <div className="hajj-icon hajj-icon-violet"><Icon name="users"/></div>
          <h3>Family Hajj Circle</h3>
          <p>Open a sample invite-only circle, follow its fund and try the member invitation view.</p>
          {extras.circle ? <>
            <p><strong>Circle HAJ-FC</strong> · 2 sample members</p>
            <details><summary>View sample invitation</summary><p>Invitation code <strong>HAJ-FC-DEMO</strong>. Sample family sponsor and pilgrim. No invitations are sent.</p></details>
            <a className="text-link hajj-inline-link" href="#hajj-sponsor-family">View family fund <Icon name="arrow-right"/></a>
          </> : <button className="outline-button" type="button" disabled={!ready} onClick={() => update(current => ({ ...current, circle: true }))}>Open sample family circle</button>}
        </article>
        <article className="hajj-path">
          <div className="hajj-icon hajj-icon-teal"><Icon name="↻"/></div>
          <h3>Recurring pledge</h3><p>Save a weekly or monthly intention independently of the funds raised.</p>
          <form className="hajj-form" onSubmit={savePledge}>
            <label>Fund<select name="fund">{funds.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <div className="hajj-fields"><label>Pledge amount (KSh)<input name="amount" type="number" min={1} max={100000000} required/></label><label>Frequency<select name="frequency">{frequencies.map(item => <option key={item}>{item}</option>)}</select></label></div>
            <button className="outline-button" disabled={!ready}>Save demo pledge</button>
          </form>
          {extras.pledges.length > 0 && <ul className="hajj-tool-list">{extras.pledges.map(item => <li key={item.fund}><span>{funds.find(fund => fund.id === item.fund)?.name} · {formatKes(item.amount)} · {item.frequency}</span><button type="button" className="text-link" onClick={() => removePledge(item.fund)}>Remove pledge</button></li>)}</ul>}
        </article>
      </div>
    </section>

    <section id="hajj-assistance" className="hajj-journey" aria-labelledby="hajj-assistance-title">
      <h2 id="hajj-assistance-title">Preparation assistance</h2>
      <div className="hajj-tools-grid">
        <article className="hajj-path">
          <div className="hajj-icon hajj-icon-blue"><Icon name="support"/></div>
          <h3>Support guide</h3><p>Try preset questions with English and Kiswahili answers.</p>
          <form className="hajj-form" onSubmit={event => { event.preventDefault(); setAnswered(question); }}>
            <label>Question<select value={question} onChange={event => setQuestion(event.target.value)}><option value="documents">Where do I review documents?</option><option value="payments">Do I pay here?</option><option value="access">Can I request accessibility support?</option></select></label>
            <label>Answer language<select value={lang} onChange={event => setLang(event.target.value === 'sw' ? 'sw' : 'en')}><option value="en">English</option><option value="sw">Kiswahili</option></select></label>
            <button className="outline-button">Show guidance</button>
          </form>
          {answered && <p role="status" lang={lang}>{answers[answered][lang]}</p>}
        </article>
        <article className="hajj-path">
          <div className="hajj-icon hajj-icon-gold"><Icon name="✦"/></div>
          <h3>AI assistance simulation</h3><p>Run a checklist-based scan of the sample documents and queue its findings for human review.</p>
          {extras.assistance && <div className="hajj-sample-document">
            <p role="status"><strong>{extras.assistance === 'reviewed' ? 'Reviewer acknowledged findings' : 'Findings queued for human review'}</strong></p>
            <ul className="hajj-tool-list">{documentItems.map((item, index) => <li key={item}><span>{item}</span><b>{extras.documents.includes(index) ? 'Reviewed' : extras.attached.includes(index) ? 'Awaiting review' : 'Sample missing'}</b></li>)}</ul>
            {extras.assistance === 'queued' && <button type="button" className="outline-button" onClick={() => update(current => current.assistance !== 'queued' ? current : addAudit({ ...current, assistance: 'reviewed' }, 'Reviewer acknowledged assistance findings'))}>Acknowledge as reviewer</button>}
          </div>}
          {hasApplication && <button type="button" className="outline-button" disabled={!ready || extras.assistance === 'queued'} onClick={() => update(current => current.assistance === 'queued' ? current : addAudit({ ...current, assistance: 'queued' }, 'Assistance findings queued for review'))}>{extras.assistance ? 'Run another sample scan' : 'Scan sample case'}</button>}
          {!hasApplication && <p><a className="text-link" href="#hajj-application">Save a sample application</a> to try the scan.</p>}
          <a className="text-link hajj-inline-link" href="#hajj-journey">Open journey and reviewer tools <Icon name="arrow-right"/></a>
        </article>
      </div>
    </section>

    <section id="hajj-future" className="hajj-journey" aria-labelledby="hajj-future-title">
      <h2 id="hajj-future-title">Savings and Umrah previews</h2>
      <div className="hajj-tools-grid">
        <article className="hajj-path">
          <div className="hajj-icon hajj-icon-gold"><Icon name="wallet"/></div>
          <h3>Partner savings simulator</h3><p>Set a Hajj savings target and test a transfer using a fictional partner account. Its balance is separate from gifts and pledges.</p>
          <form className="hajj-form" onSubmit={saveGoal}>
            <label>Target amount (KSh)<input key={extras.savings?.target ?? 0} name="target" type="number" min={extras.savings?.saved || 1} max={100000000} defaultValue={extras.savings?.target} required/></label>
            <button className="outline-button" disabled={!ready}>{extras.savings ? 'Update savings target' : 'Open sample savings account'}</button>
          </form>
          {extras.savings && <>
            <div className="hajj-funding"><p>Partner sandbox · DEMO-S104</p><p aria-live="polite">{formatKes(extras.savings.saved)} of {formatKes(extras.savings.target)}</p><progress aria-label="Sample savings progress" value={extras.savings.saved} max={extras.savings.target}/></div>
            {extras.savings.saved < extras.savings.target && <form className="hajj-form" onSubmit={logSavings}><label>Sample transfer (KSh)<input name="amount" type="number" min={1} max={extras.savings.target - extras.savings.saved} required/></label><button className="outline-button">Simulate partner transfer</button></form>}
          </>}
        </article>
        <article className="hajj-path">
          <div className="hajj-icon hajj-icon-violet"><Icon name="☾"/></div>
          <h3>Umrah support</h3><p>Preview a separate preparation path with provider, accessibility and welfare checks.</p>
          <button className="outline-button" type="button" disabled={!ready} onClick={() => update(current => ({ ...current, umrah: !current.umrah }))}>{extras.umrah ? 'Remove sample Umrah plan' : 'Save sample Umrah plan'}</button>
          {extras.umrah && <p role="status">Sample plan saved · Confirm provider route, review accessibility and prepare a welfare contact plan.</p>}
        </article>
      </div>
    </section>
    <p className="hajj-status" role="status">{feedback}</p>
  </>;
}

const answers: Record<string, Record<'en' | 'sw', string>> = {
  documents: { en: 'Open My journey and use the programme review checklist for the sample case.', sw: 'Fungua My journey kisha utumie orodha ya ukaguzi wa mfano.' },
  payments: { en: 'Amanah Hajj uses sample contributions. The demo does not collect payments or bank details.', sw: 'Amanah Hajj hutumia michango ya mfano. Onyesho hili halikusanyi malipo au taarifa za benki.' },
  access: { en: 'Choose the preset accessibility profile on the support application. The sample case lets you review a welfare plan.', sw: 'Chagua wasifu wa mfano wa mahitaji ya ufikivu kwenye ombi la msaada, kisha kagua mpango wa ustawi.' },
};
