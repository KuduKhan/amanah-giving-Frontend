'use client';

import Icon from './Icon';
import AmanahLogo from './AmanahLogo';
import WorkflowStudio from './workflows/WorkflowStudio';
import Image from 'next/image';
import { downloadText } from './givingDrafts';

import { createContext, FormEvent, useContext, useRef, useState } from 'react';

const WorkflowActions = createContext<(message: string) => void>(() => {});

type ActionProps = { act: (message: string) => void };

type DonorProps = ActionProps & { onGive: () => void; notifications: boolean; setNotifications: (value: boolean) => void; privateProfile: boolean; setPrivateProfile: (value: boolean) => void };

export type Portal = 'donor' | 'beneficiary' | 'organization' | 'admin' | 'finance' | 'shariah';

export const portals: { id: Portal; label: string; icon: string; role: string }[] = [
  { id: 'donor', label: 'Donor', icon: 'heart', role: 'Give, plan and trace impact' },
  { id: 'beneficiary', label: 'Beneficiary', icon: 'giving', role: 'Request assistance privately' },
  { id: 'organization', label: 'Organization', icon: 'platform', role: 'Deliver verified programs' },
  { id: 'admin', label: 'Admin', icon: 'shield', role: 'Verify, review and protect' },
  { id: 'finance', label: 'Finance', icon: 'wallet', role: 'Reconcile restricted funds' },
  { id: 'shariah', label: 'Shariah', icon: 'book', role: 'Govern giving policy' },
];

const featureCatalog = [
  { title: 'Recurring Sadaqah', text: 'Daily, Jumu’ah, monthly, Ramadan or last-ten-night schedules.', status: '4 active', icon: '↻' },
  { title: 'Orphan sponsorship', text: 'Privacy-first child profiles, welfare milestones and sponsor reports.', status: '18 matched', icon: '♡' },
  { title: 'Food & Qur’an packages', text: 'Choose a fixed package, destination and verified distribution partner.', status: '6 packages', icon: '□' },
  { title: 'Mosque profiles', text: 'Follow construction, classes, community services and funding needs.', status: '12 followed', icon: '⌂' },
  { title: 'Giving circles', text: 'Invite family or colleagues, set a shared target and give together.', status: '2 circles', icon: '○' },
  { title: 'Corporate giving', text: 'Team budgets, matching, payroll giving and consolidated reporting.', status: 'Ready', icon: '▦' },
];

const financeJournal: string[][] = [
  ['AMN-948231', 'M-PESA clearing', '5,090', '—', 'Matched'],
  ['AMN-948231', 'WTR-284 restricted', '—', '5,000', 'Posted'],
  ['AMN-948231', 'Payment costs', '—', '90', 'Posted'],
  ['DIS-28114', 'WTR-284 restricted', '240,000', '—', 'Approved'],
];

function financeJournalCsv() {
  const rows = [['Reference', 'Account', 'Debit', 'Credit', 'Status'], ...financeJournal];
  return `\uFEFF${rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;
}

export default function PlatformConsole({ onClose, onGive, initialPortal = 'donor' }: { onClose: () => void; onGive: () => void; initialPortal?: Portal }) {
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantReply, setAssistantReply] = useState('');

  const workspace = useRef<HTMLDivElement>(null);
  const portalTitle = portals.find(item => item.id === portal)!;
  function selectPortal(id: Portal) {
    if (id === portal) return;
    setPortal(id);
    setMessage('');
    setAssistantOpen(false);
    workspace.current?.scrollTo({ top: 0 });
  }
  const act = (text: string) => {
    setMessage(text);
    requestAnimationFrame(() => workspace.current?.querySelector<HTMLElement>('#workflow-preview')?.focus());
  };

  return <WorkflowActions.Provider value={act}><div className="platform-overlay" role="dialog" aria-modal="true" aria-label="Amanah platform console">
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-brand"><AmanahLogo variant="light" size="sm" showTagline={false}/><div><b>AMANAH</b><small>PLATFORM</small></div></div>
        <p className="platform-kicker">YOUR WORKSPACES</p>
        <nav aria-label="Platform portals">
          {portals.map(item => <button type="button" key={item.id} className={portal === item.id ? 'active' : ''} aria-label={item.label} aria-current={portal === item.id ? 'true' : undefined} aria-controls="platform-workspace" onClick={() => selectPortal(item.id)}><i><Icon name={item.icon}/></i><span><b>{item.label}</b><small>{item.role}</small></span></button>)}
        </nav>
        <div className="platform-security"><span><Icon name="●"/></span><div><b>Example workspace</b><small>No live records connected</small></div></div>
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div><p>Amanah Platform · {portalTitle.label}</p><h2 id="platform-workspace-title">{portalTitle.role}</h2></div>
          <div>
            <button className="platform-ai" type="button" aria-label="Giving guide" aria-expanded={assistantOpen} aria-controls="platform-guide" onClick={() => {
              if (!assistantOpen) workspace.current?.scrollTo({ top: 0 });
              setAssistantOpen(!assistantOpen);
            }}><Icon name="✦"/><span>Giving guide</span></button>
            <button className="platform-close" type="button" onClick={onClose} aria-label="Close platform"><Icon name="close"/></button>
          </div>
        </header>
        <div ref={workspace} className="platform-scroll" id="platform-workspace" role="region" aria-labelledby="platform-workspace-title">
        <form id="platform-guide" className="assistant-bar" hidden={!assistantOpen} onSubmit={(event: FormEvent) => { event.preventDefault(); setAssistantReply('Example guidance (not personalised): a verified water or education Sadaqah Jariyah campaign may fit. I can explain options, but I do not issue religious rulings or move funds.'); }}><input aria-label="Ask the example giving guide" placeholder="Ask about giving types, causes or impact" required/><button type="submit">Ask</button>{assistantReply && <p role="status">{assistantReply}</p>}</form>

        <div className="platform-content"><p className="preview-note">Workspace examples · Figures, records and controls are illustrative. No organization, account or financial changes are submitted.</p>{message && <section className="workflow-preview" id="workflow-preview" tabIndex={-1} aria-labelledby="workflow-title"><button className="workflow-close" aria-label="Close workflow preview" onClick={() => setMessage('')}><Icon name="close"/></button><p className="eyebrow">Workflow preview</p><h3 id="workflow-title">{message.replace(/ (opened|created|saved|submitted|approved|prepared)$/i, '')}</h3><p>This task is shown as a preview. No record was submitted, approved, downloaded or changed on a live service.</p><button className="text-link" onClick={() => downloadText('amanah-workflow-note.txt', `AMANAH GIVING — WORKFLOW NOTE\n${message}\nPreview only. No live record was changed.\n`)}>Download workflow note <Icon name="→"/></button></section>}
          <WorkflowStudio role={portal}/>
          {portal === 'donor' && <DonorPortal onGive={onGive} act={act} notifications={notifications} setNotifications={setNotifications} privateProfile={privateProfile} setPrivateProfile={setPrivateProfile}/>} 
          {portal === 'beneficiary' && <BeneficiaryPortal act={act}/>} 
          {portal === 'organization' && <OrganizationPortal act={act}/>} 
          {portal === 'admin' && <AdminPortal act={act}/>} 
          {portal === 'finance' && <FinancePortal act={act}/>} 
          {portal === 'shariah' && <ShariahPortal act={act}/>} 
        </div>
        </div>
      </div>
    </div>

  </div></WorkflowActions.Provider>;
}

function DonorPortal({ onGive, act, notifications, setNotifications, privateProfile, setPrivateProfile }: DonorProps) {
  return <>
    <div className="portal-welcome"><div><p className="portal-label">ASSALAMU ALAIKUM, AMINA</p><h3>Your generosity is becoming visible impact.</h3><p>Follow every gift from payment confirmation to verified outcome.</p></div><button className="button" onClick={onGive}>Give now <Icon name="↗"/></button></div>
    <div className="portal-metrics">{[['KSh 72,450','Total given'],['24','Projects supported'],['4','Recurring plans'],['18','Verified outcomes']].map(([value,label]) => <div key={label}><span>{label}</span><b>{value}</b><small><Icon name="↑"/> Updated today</small></div>)}</div>
    <div className="portal-grid donor-grid">
      <section className="portal-card trace-card"><CardHead eyebrow="GIFT JOURNEY" title="Trace gift AMN-948231" action="Full evidence →"/><div className="trace-route">{[['✓','Payment','Confirmed'],['✓','Fund','Restricted'],['✓','Approval','3 of 3'],['✓','Delivery','Completed'],['✓','Impact','340 people']].map((x,i) => <div key={x[1]} className="trace-node"><i><Icon name={x[0]}/></i><b>{x[1]}</b><small>{x[2]}</small>{i < 4 && <span/>}</div>)}</div><div className="trace-detail"><Image src="/water-community.jpg" alt="Completed water project" width={600} height={420}/><div><span>WTR-183 · GARISSA</span><b>Clean water is flowing</b><p>Water test, contractor invoices, completion photos and beneficiary count verified.</p><button onClick={() => act('Evidence bundle opened')}>View 7 evidence files <Icon name="↗"/></button></div></div></section>
      <section className="portal-card"><CardHead eyebrow="UPCOMING" title="Giving plans" action="Manage"/><div className="schedule-list">{[['Jumu’ah Sadaqah','Every Friday','KSh 500'],['Last 10 Nights','20–29 Ramadan','KSh 1,000'],['Orphan sponsorship','Monthly','KSh 3,500']].map(x => <button key={x[0]} onClick={() => act(`${x[0]} plan opened`)}><i><Icon name="↻"/></i><span><b>{x[0]}</b><small>{x[1]}</small></span><strong>{x[2]}</strong></button>)}</div><button className="add-plan" onClick={() => act('New giving plan created')}>+ Create giving plan</button></section>
    </div>
    <section className="portal-card"><CardHead eyebrow="WAYS TO GIVE" title="More paths to lasting benefit"/><div className="feature-catalog">{featureCatalog.map(item => <button key={item.title} onClick={() => act(`${item.title} opened`)}><i><Icon name={item.icon}/></i><span><b>{item.title}</b><p>{item.text}</p><small>{item.status} <em><Icon name="→"/></em></small></span></button>)}</div></section>
    <div className="portal-grid three"><section className="portal-card compact-card"><CardHead eyebrow="NOTIFICATIONS" title="Stay informed"/><Toggle label="Impact and payment updates" checked={notifications} setChecked={setNotifications}/><p className="microcopy">Channels: in-app, email, SMS and WhatsApp. Essential payment receipts cannot be disabled.</p></section><section className="portal-card compact-card"><CardHead eyebrow="PRIVACY" title="You control visibility"/><Toggle label="Keep donor profile private" checked={privateProfile} setChecked={setPrivateProfile}/><p className="microcopy">Anonymous gifts remain visible to finance controls but never to the public.</p></section><section className="portal-card compact-card"><CardHead eyebrow="EXPANSION LAB" title="Built for what comes next"/><div className="tag-cloud"><span>Multi-currency</span><span>Waqf</span><span>Open API</span><span>Mobile app</span><span>Institutional dashboards</span></div></section></div>
  </>;
}

function BeneficiaryPortal({ act }: ActionProps) {
  const [step, setStep] = useState(1);
  const [requestType, setRequestType] = useState('');
  const [details, setDetails] = useState('');
  const [contactTime, setContactTime] = useState('Morning');

  return <>
    <div className="portal-welcome beneficiary">
      <div><p className="portal-label">PRIVATE ASSISTANCE WORKFLOW</p><h3>Ask for help with dignity.</h3><p>Try the assistance process with sample information.</p></div>
      <span className="privacy-badge"><Icon name="shield"/> Private by default</span>
    </div>
    <div className="portal-grid beneficiary-grid">
      <section className="portal-card">
        <CardHead eyebrow={`STEP ${step} OF 4`} title={['Tell us what is needed', 'Add supporting details', 'Choose a safe contact', 'Review your request'][step - 1]}/>
        <div className="form-progress" role="progressbar" aria-label="Sample request progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step}><span style={{ width: `${step * 25}%` }}/></div>
        {step === 1 && <div className="request-types" role="group" aria-label="Assistance type">
          {['Food support', 'Medical assistance', 'Education', 'Shelter', 'Water access', 'Other urgent need'].map(type => (
            <button key={type} type="button" aria-pressed={requestType === type} onClick={() => setRequestType(type)}>{type}<span><Icon name={requestType === type ? 'check' : 'chevron'}/></span></button>
          ))}
        </div>}
        {step === 2 && <label className="portal-field">Sample supporting details
          <select value={details} onChange={event => setDetails(event.target.value)}>
            <option value="">Choose an optional fictional situation</option>
            <option value="Illustrative school materials request">Illustrative school materials request</option>
            <option value="Illustrative household food request">Illustrative household food request</option>
            <option value="Illustrative shelter request">Illustrative shelter request</option>
            <option value="Illustrative transport assistance request">Illustrative transport assistance request</option>
          </select>
          <small>Only preset examples are accepted. No identifiable personal or health details.</small>
        </label>}
        {step === 3 && <div className="portal-form">
          <p className="safety-note" role="note">Contact details are intentionally disabled until a private, backend-protected application process exists.</p>
          <label>Safe time to contact<select value={contactTime} onChange={event => setContactTime(event.target.value)}><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
        </div>}
        {step === 4 && <div className="review-box">
          <b>{requestType}</b>
          <p>{details.trim() || 'No supporting details added.'}</p>
          <p>No personal contact collected · Preferred example contact window: {contactTime}</p>
        </div>}
        <div className="form-actions">
          <button className="portal-back-button" type="button" disabled={step === 1} onClick={() => setStep(step - 1)} aria-label="Return to previous request step"><Icon name="arrow-left"/> Back</button>
          <button type="button" className="button" disabled={!requestType} onClick={() => {
            if (step < 4) setStep(step + 1);
            else act(`${requestType} request review`);
          }}>{step < 4 ? <>Continue <Icon name="arrow-right"/></> : 'Preview request'}</button>
        </div>
      </section>
      <section className="portal-card">
        <CardHead eyebrow="MY REQUESTS" title="Track without exposure"/>
        <div className="case-card"><span className="case-status">Verification in progress</span><b>Education support · REQ-1842</b><p>Documents received. Your assigned verifier will contact you in your preferred window.</p><div><span>Submitted</span><span>Identity check</span><span className="pending">Decision</span><span className="pending">Delivery</span></div></div>
        <div className="safety-note"><i><Icon name="shield"/></i><p><b>Your safety matters.</b><br/>Amanah never asks for payment to approve assistance. Report suspicious contact immediately.</p></div>
      </section>
    </div>
  </>;
}

function OrganizationPortal({ act }: ActionProps) {
  return <><div className="portal-welcome"><div><p className="portal-label">AL-RAHMAH COMMUNITY TRUST</p><h3>Deliver programs. Prove every outcome.</h3><p>One workspace for fundraising, approvals, field evidence and beneficiary-safe reporting.</p></div><span className="verified-org"><Icon name="✓"/> Level 4 verified</span></div><div className="portal-metrics">{[['12','Active projects'],['KSh 8.4M','Restricted balance'],['94%','Reporting score'],['3','Items need action']].map(x => <div key={x[1]}><span>{x[1]}</span><b>{x[0]}</b><small>Current period</small></div>)}</div><div className="portal-grid"><section className="portal-card"><CardHead eyebrow="PROGRAM DELIVERY" title="Active project controls" action="View all"/><DataRows rows={[['WTR-284','Garissa water project','82%','Evidence due'],['MSQ-112','Al-Rahmah mosque','64%','On track'],['FOD-541','Mombasa food packs','100%','Reconcile']]}/></section><section className="portal-card"><CardHead eyebrow="ACTION QUEUE" title="Three items need you"/><div className="task-list">{[['Upload water-test report','Due today','High'],['Confirm food-pack recipients','Due in 2 days','Review'],['Approve contractor invoice','KSh 240,000','Maker']].map(x => <button key={x[0]} onClick={() => act(`${x[0]} opened`)}><span><b>{x[0]}</b><small>{x[1]}</small></span><em>{x[2]}</em></button>)}</div></section></div><div className="portal-grid three">{[['Campaign builder','Draft budgets, milestones, locations and update schedules.'],['Team & roles','Owner, fundraising, field officer, finance and read-only auditor.'],['Evidence center','Upload photos, receipts, beneficiary counts and third-party reports.']].map(x => <section className="portal-card module-card" key={x[0]}><i><Icon name="◇"/></i><h4>{x[0]}</h4><p>{x[1]}</p><button onClick={() => act(`${x[0]} opened`)}>Open module <Icon name="→"/></button></section>)}</div></>;
}

function AdminPortal({ act }: ActionProps) {
  return <><div className="portal-welcome admin"><div><p className="portal-label">AMANAH COMMAND CENTER</p><h3>Protect trust at platform scale.</h3><p>Risk, verification, content, complaints and disbursement oversight in one decision queue.</p></div><span className="live-badge"><Icon name="●"/> Monitoring preview</span></div><div className="portal-metrics">{[['218','Active campaigns'],['KSh 24.6M','Funds in custody'],['17','Verification queue'],['2','Risk alerts']].map(x => <div key={x[1]}><span>{x[1]}</span><b>{x[0]}</b><small>Across Kenya</small></div>)}</div><div className="portal-grid admin-review-grid"><section className="portal-card admin-queue-card"><CardHead eyebrow="PRIORITY QUEUE" title="Review and decide"/><DataRows rows={[['ORG-442','Identity mismatch','Risk 82','Investigate'],['WTR-614','Budget changed +18%','Risk 61','Review'],['REQ-1842','Beneficiary verified','Risk 12','Approve']]}/><button className="add-plan" onClick={() => act('Decision audit log opened')}>View immutable decision log</button></section><section className="portal-card admin-verification-card"><CardHead eyebrow="VERIFICATION LADDER" title="Evidence, not a single badge"/><div className="level-list">{[['0','Unverified','Profile only'],['1','Identity verified','People checked'],['2','Organization verified','Registration checked'],['3','Campaign verified','Need and budget checked'],['4','Impact verified','Outcome evidence checked']].map(x => <div key={x[0]} className={x[0] === '4' ? 'active' : ''}><i>{x[0]}</i><span><b>{x[1]}</b><small>{x[2]}</small></span></div>)}</div></section></div><section className="portal-card"><CardHead eyebrow="ANTI-FRAUD CONTROL ROOM" title="Checks before money moves"/><div className="control-grid">{['Duplicate identity detection','Document tamper signals','Device and velocity checks','Sanctions and watchlist screening','Budget anomaly detection','Maker–checker–approver release'].map((x,i) => <button key={x} onClick={() => act(`${x} details opened`)}><span>{i < 5 ? <Icon name="✓"/> : '3/3'}</span><b>{x}</b><small>{i < 5 ? 'No current exception' : 'Separation of duties enforced'}</small></button>)}</div></section></>;
}

function FinancePortal({ act }: ActionProps) {
  return <>
    <div className="portal-welcome finance">
      <div><p className="portal-label">RESTRICTED-FUND LEDGER</p><h3>Every shilling has a source and destination.</h3><p>Double-entry accounting, payment reconciliation and auditable disbursement controls.</p></div>
      <span className="reconciled"><Icon name="✓"/> Books reconciled</span>
    </div>
    <div className="portal-metrics">{[['KSh 24.6M','Custodial balance'],['KSh 6.2M','Zakat restricted'],['KSh 1.8M','Pending release'],['100%','Entries balanced']].map(x => <div key={x[1]}><span>{x[1]}</span><b>{x[0]}</b><small>As of today</small></div>)}</div>
    <div className="portal-grid finance-grid">
      <section className="portal-card ledger-card">
        <CardHead eyebrow="RECENT JOURNAL" title="Balanced entries" action="Export CSV" onAction={() => downloadText('amanah-example-finance-ledger.csv', financeJournalCsv(), 'text/csv;charset=utf-8')}/>
        <div className="ledger-head"><span>Reference</span><span>Account</span><span>Debit</span><span>Credit</span><span>Status</span></div>
        {financeJournal.map(row => <div className="ledger-row" key={row.join()}>{row.map((value, index) => <span key={index} data-label={['Reference', 'Account', 'Debit', 'Credit', 'Status'][index]}>{value}</span>)}</div>)}
      </section>
      <section className="portal-card finance-release">
        <CardHead eyebrow="RELEASE CONTROL" title="DIS-28114 · KSh 240,000"/>
        <div className="approval-stack">{[['Maker','Yusuf Ali','Prepared'],['Checker','Maryam Noor','Verified'],['Approver','Finance lead','Approved']].map(x => <div key={x[0]}><i><Icon name="✓"/></i><span><small>{x[0]}</small><b>{x[1]}</b></span><em>{x[2]}</em></div>)}</div>
        <div className="restricted-note"><b>Restriction check passed</b><p>Campaign WTR-284 · contractor invoice · milestone 3 of 4 · available balance KSh 812,400.</p></div>
        <button className="button full" onClick={() => act('Payment instruction prepared for secure settlement')}>Prepare settlement <Icon name="→"/></button>
      </section>
      <section className="portal-card finance-funds">
        <CardHead eyebrow="FUND SEGREGATION" title="Giving types remain immutable"/>
        <div className="fund-pills">{[['Zakat','KSh 6.2M'],['Sadaqah','KSh 9.4M'],['Sadaqah Jariyah','KSh 7.1M'],['Waqf','KSh 1.3M'],['Fidyah / Kaffarah','KSh 0.6M']].map(x => <button key={x[0]} onClick={() => act(`${x[0]} sub-ledger opened`)}><span>{x[0]}</span><b>{x[1]}</b></button>)}</div>
      </section>
    </div>
  </>;
}

function ShariahPortal({ act }: ActionProps) {
  return <><div className="portal-welcome shariah"><div><p className="portal-label">SHARIAH GOVERNANCE CONSOLE</p><h3>Clear policy. Versioned decisions. Visible accountability.</h3><p>Eligibility, fund handling and distribution rules are reviewed without exposing private donor data.</p></div><span className="policy-badge">POLICY v3.2 ACTIVE</span></div><div className="portal-grid"><section className="portal-card"><CardHead eyebrow="POLICY REGISTER" title="Active rules and decisions"/><DataRows rows={[['ZKT-3.2','Zakat eligibility & segregation','Active','12 Jun 2026'],['WQF-1.4','Waqf principal protection','Active','05 May 2026'],['FDY-2.1','Fidyah distribution standard','Review','30 Aug 2026']]}/></section><section className="portal-card"><CardHead eyebrow="REVIEW QUEUE" title="Scholarly decisions needed"/><div className="task-list">{[['Mixed-benefit water campaign','Zakat eligibility','2 opinions'],['Corporate matching fund','Restricted use','New'],['Digital Waqf pilot','Principal custody','Priority']].map(x => <button key={x[0]} onClick={() => act(`${x[0]} review opened`)}><span><b>{x[0]}</b><small>{x[1]}</small></span><em>{x[2]}</em></button>)}</div></section></div><section className="portal-card"><CardHead eyebrow="GOVERNANCE BOUNDARIES" title="What the platform enforces"/><div className="governance-grid">{[['Immutable intention','A donation’s giving type cannot be silently changed after payment.'],['Restricted distribution','Zakat and other restricted funds can only reach approved categories.'],['Versioned policy','Every eligibility decision records the policy version used.'],['Independent oversight','Scholars review rules and exceptions; operators cannot self-approve.'],['Public explanation','Donors see plain-language policy without private case data.'],['AI boundaries','The assistant explains platform policy but never issues a fatwa.']].map(x => <div key={x[0]}><i><Icon name="✓"/></i><span><b>{x[0]}</b><p>{x[1]}</p></span></div>)}</div></section></>;
}

function CardHead({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  const act = useContext(WorkflowActions);
  return <div className="card-head"><div><p>{eyebrow}</p><h4>{title}</h4></div>{action && <button type="button" onClick={() => {
    if (onAction) onAction();
    else act(`${title}: ${action.replace(/\s*→$/, '')}`);
  }}>{action.replace(/\s*→$/, '')}<Icon name="→"/></button>}</div>;
}
function Toggle({ label, checked, setChecked }: { label: string; checked: boolean; setChecked: (value: boolean) => void }) { return <button className="toggle-row" role="switch" aria-checked={checked} onClick={() => setChecked(!checked)}><span>{label}</span><i className={checked ? 'on' : ''}><b/></i></button>; }
function DataRows({ rows }: { rows: string[][] }) { const act = useContext(WorkflowActions); return <div className="data-rows">{rows.map(row => <button key={row[0]} onClick={() => act(`Review ${row[0]}: ${row[1]}`)}>{row.map((cell,index) => <span key={cell} className={index === row.length-1 ? 'row-action' : ''}>{cell}</span>)}</button>)}</div>; }
