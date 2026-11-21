'use client';

import { useState, type FormEvent } from 'react';
import Icon from '../Icon';
import {
  counties, needs, newDemoSnapshot, createMemoryWorkflowGateway,
  fundBalance, disbursedToCampaign, fundTypes,
  type WorkflowRole, type WorkflowCommand, type WorkflowSnapshot,
  type County, type Need, type FundType,
} from './workflowDomain';
import './workflow-studio.css';

const formatKes = (value: number) => 'KSh ' + value.toLocaleString('en-KE');
const roleTitles: Record<WorkflowRole, string> = {
  donor: 'Prepare a fictional gift',
  beneficiary: 'Submit an anonymous assistance scenario',
  organization: 'Build a sample campaign',
  admin: 'Review a campaign or assistance case',
  finance: 'Allocate restricted sample funds',
  shariah: 'Review simulated Zakat eligibility',
};
const roleDescriptions: Record<WorkflowRole, string> = {
  donor: 'Test the donor-to-ledger journey without connecting to M-PESA or charging anyone.',
  beneficiary: 'No names, contact information, documents or free-text medical or financial details are collected.',
  organization: 'Draft an illustrative budget, then move the submission to the administrator queue.',
  admin: 'Approve or return campaigns, and review cases without accessing identifiable beneficiary information.',
  finance: 'A sample release can only use an approved campaign and its matching ring-fenced fund.',
  shariah: 'A Zakat campaign needs a separate, explicit sample eligibility decision before admin approval.',
};

export default function WorkflowStudio({ role }: { role: WorkflowRole }) {
  const [gateway] = useState(() => createMemoryWorkflowGateway());
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot>(() => newDemoSnapshot());
  const [expanded, setExpanded] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [giftAmount, setGiftAmount] = useState('1000');
  const [giftType, setGiftType] = useState<FundType>('sadaqah');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignCounty, setCampaignCounty] = useState<County>('Garissa');
  const [campaignFund, setCampaignFund] = useState<FundType>('sadaqah');
  const [campaignBudget, setCampaignBudget] = useState('50000');
  const [caseNeed, setCaseNeed] = useState<Need>('Education');
  const [caseCounty, setCaseCounty] = useState<County>('Mombasa');
  const [allocationCampaign, setAllocationCampaign] = useState('CAM-DEMO-100');
  const [allocationAmount, setAllocationAmount] = useState('5000');
  const [showLedger, setShowLedger] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const submittedCampaigns = snapshot.campaigns.filter(row => row.status === 'submitted');
  const zakatQueue = submittedCampaigns.filter(row => row.fundType === 'zakat' && row.shariah === 'pending');
  const approvedCampaigns = snapshot.campaigns.filter(row => row.status === 'approved');
  const pendingCases = snapshot.cases.filter(row => row.status === 'submitted' || row.status === 'more-information');

  async function apply(command: WorkflowCommand, feedback: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await gateway.execute(command);
      setSnapshot(next);
      setNotice(feedback + ' This changed only fictional, in-memory records.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'This sample action could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setSnapshot(await gateway.reset());
      setNotice('All example workflow records were reset. No live data was changed.');
      setAllocationCampaign('CAM-DEMO-100');
    } finally {
      setBusy(false);
    }
  }

  const givingTypeLabel = (type: FundType) => type === 'zakat' ? 'Zakat (restricted)' : 'Sadaqah';
  const inputCurrency = (value: string, setter: (value: string) => void) =>
    setter(value.replace(/[^0-9]/g, '').slice(0, 8));

  return (
    <section className="amanah-workflow" aria-labelledby="amanah-workflow-title">
      <div className="amanah-workflow-heading">
        <div className="amanah-workflow-heading-copy">
          <span className="amanah-workflow-kicker"><Icon name="shield"/> FRONTEND OPERATIONS STUDIO</span>
          <h3 id="amanah-workflow-title">From intention to accountable outcome.</h3>
          <p>Try connected, role-aware giving workflows before the backend is introduced.</p>
        </div>
        <button type="button" className="amanah-workflow-toggle" aria-expanded={expanded}
          aria-controls="amanah-workflow-body" onClick={() => setExpanded(open => !open)}>
          {expanded ? 'Hide studio' : 'Open studio'} <Icon name="chevron"/>
        </button>
      </div>
      <div className="amanah-workflow-safety" role="note"><Icon name="shield"/>
        <span><strong>Interactive prototype only.</strong> Every figure, person, case, decision and fund movement is fictional. No authentication, payment, private document, real approval or money transfer occurs. Records reset on refresh.</span>
      </div>
      {expanded && <div id="amanah-workflow-body" className="amanah-workflow-body">
        <div className="amanah-workflow-metrics" aria-label="Illustrative restricted fund balances">
          {fundTypes.map(type => <div className="amanah-workflow-metric" key={type}>
            <span>{givingTypeLabel(type)} · sample balance</span>
            <strong>{formatKes(fundBalance(snapshot, type))}</strong>
            <small>Separate illustrative fund bucket</small>
          </div>)}
          <div className="amanah-workflow-metric">
            <span>Campaigns awaiting admin</span>
            <strong>{submittedCampaigns.length}</strong>
            <small>{zakatQueue.length} awaiting Shariah review</small>
          </div>
          <div className="amanah-workflow-metric">
            <span>Assistance cases requiring attention</span>
            <strong>{pendingCases.length}</strong>
            <small>Anonymous sample scenarios only</small>
          </div>
        </div>

        <div className="amanah-workflow-panel" aria-labelledby="amanah-workflow-task">
          <div className="amanah-workflow-task-heading">
            <span className="amanah-workflow-role"><Icon name="check"/> {role.toUpperCase()} WORKFLOW</span>
            <h4 id="amanah-workflow-task">{roleTitles[role]}</h4>
            <p>{roleDescriptions[role]}</p>
          </div>

          {role === 'donor' && <form className="amanah-workflow-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void apply({ type: 'simulated-gift', role: 'donor', fundType: giftType, amountKes: Number(giftAmount) }, 'Fictional giving entry recorded.');
          }}>
            <label>Giving type
              <select value={giftType} onChange={event => setGiftType(event.target.value as FundType)}>
                {fundTypes.map(type => <option key={type} value={type}>{givingTypeLabel(type)}</option>)}
              </select>
            </label>
            <label>Sample amount (KSh)
              <input inputMode="numeric" value={giftAmount} onChange={event => inputCurrency(event.target.value, setGiftAmount)}
                required aria-describedby="amanah-donor-note"/>
            </label>
            <button className="amanah-workflow-primary" type="submit" disabled={busy}>Simulate donation <Icon name="arrow-right"/></button>
            <p id="amanah-donor-note" className="amanah-workflow-footnote">Adds a sample giving entry to the selected fund bucket. It is not a payment or receipt.</p>
          </form>}

          {role === 'organization' && <form className="amanah-workflow-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void apply({ type: 'create-campaign', role: 'organization', title: campaignTitle, county: campaignCounty, fundType: campaignFund, budgetKes: Number(campaignBudget) }, 'Campaign submitted to the example review queue.');
          }}>
            <label className="amanah-workflow-wide">Campaign name (fictional)
              <input type="text" value={campaignTitle} onChange={event => setCampaignTitle(event.target.value.slice(0, 80))}
                placeholder="e.g. Garissa school supplies" required minLength={6} maxLength={80}/>
            </label>
            <label>County
              <select value={campaignCounty} onChange={event => setCampaignCounty(event.target.value as County)}>
                {counties.map(county => <option key={county}>{county}</option>)}
              </select>
            </label>
            <label>Giving purpose
              <select value={campaignFund} onChange={event => setCampaignFund(event.target.value as FundType)}>
                {fundTypes.map(type => <option key={type} value={type}>{givingTypeLabel(type)}</option>)}
              </select>
            </label>
            <label>Illustrative budget (KSh)
              <input inputMode="numeric" value={campaignBudget} onChange={event => inputCurrency(event.target.value, setCampaignBudget)} required/>
            </label>
            <button className="amanah-workflow-primary" type="submit" disabled={busy}>Submit for mock review <Icon name="arrow-right"/></button>
          </form>}

          {role === 'organization' && snapshot.campaigns.some(row => row.status === 'changes-requested') &&
            <div className="amanah-workflow-revisions">
              <h5>Returned campaigns — revise and resubmit</h5>
              {snapshot.campaigns.filter(row => row.status === 'changes-requested').map(campaign =>
                <form className="amanah-workflow-revision" key={campaign.id} onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  const fields = new FormData(event.currentTarget);
                  void apply({
                    type: 'revise-campaign', role: 'organization', campaignId: campaign.id,
                    title: String(fields.get('title') || ''), budgetKes: Number(fields.get('budget')),
                  }, 'Revised campaign resubmitted.');
                }}>
                  <p>{campaign.id} · {campaign.county} · {givingTypeLabel(campaign.fundType)}</p>
                  <label>Updated fictional title
                    <input name="title" type="text" required minLength={6} maxLength={80} defaultValue={campaign.title}/>
                  </label>
                  <label>Updated sample budget (KSh)
                    <input name="budget" type="number" min={1000} max={5000000} step={1} required defaultValue={campaign.budgetKes}/>
                  </label>
                  <button type="submit" disabled={busy} className="amanah-workflow-primary">Resubmit sample <Icon name="arrow-right"/></button>
                </form>)}
            </div>}

          {role === 'beneficiary' && <form className="amanah-workflow-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void apply({ type: 'submit-case', role: 'beneficiary', need: caseNeed, county: caseCounty }, 'Anonymous assistance scenario submitted.');
          }}>
            <label>Sample assistance category
              <select value={caseNeed} onChange={event => setCaseNeed(event.target.value as Need)}>
                {needs.map(need => <option key={need}>{need}</option>)}
              </select>
            </label>
            <label>Fictional county
              <select value={caseCounty} onChange={event => setCaseCounty(event.target.value as County)}>
                {counties.map(county => <option key={county}>{county}</option>)}
              </select>
            </label>
            <button className="amanah-workflow-primary" type="submit" disabled={busy}>Submit safe sample case <Icon name="arrow-right"/></button>
            <p className="amanah-workflow-footnote">No identity, contact, financial, health or supporting documents are accepted here.</p>
          </form>}

          {role === 'shariah' && <div className="amanah-workflow-queue">
            {zakatQueue.length === 0 ? <p className="amanah-workflow-empty">No outstanding sample Zakat eligibility decisions.</p> : zakatQueue.map(campaign =>
              <article className="amanah-workflow-review" key={campaign.id}>
                <div><span>{campaign.id} · {campaign.county}</span><b>{campaign.title}</b><small>{formatKes(campaign.budgetKes)} · Zakat review pending</small></div>
                <div className="amanah-workflow-review-actions">
                  <button type="button" disabled={busy} onClick={() => void apply({ type: 'evaluate-zakat', role: 'shariah', campaignId: campaign.id, eligible: true }, 'Example eligibility approved.')}>Mark eligible</button>
                  <button type="button" disabled={busy} className="amanah-workflow-secondary" onClick={() => void apply({ type: 'evaluate-zakat', role: 'shariah', campaignId: campaign.id, eligible: false }, 'Example eligibility declined.')}>Not eligible</button>
                </div>
              </article>)}
            <p className="amanah-workflow-footnote">These buttons illustrate policy gates; they are not religious rulings or real eligibility assessments.</p>
          </div>}

          {role === 'admin' && <div className="amanah-workflow-queue">
            <h5>Campaign verification queue</h5>
            {submittedCampaigns.length === 0 && <p className="amanah-workflow-empty">No sample campaigns awaiting review.</p>}
            {submittedCampaigns.map(campaign => <article className="amanah-workflow-review" key={campaign.id}>
              <div><span>{campaign.id} · {campaign.county} · {givingTypeLabel(campaign.fundType)}</span><b>{campaign.title}</b>
                <small>{formatKes(campaign.budgetKes)} · Shariah: {campaign.shariah}</small></div>
              <div className="amanah-workflow-review-actions">
                <button type="button" disabled={busy || (campaign.fundType === 'zakat' && campaign.shariah !== 'eligible')}
                  title={campaign.fundType === 'zakat' && campaign.shariah !== 'eligible' ? 'Zakat needs eligible Shariah decision' : ''}
                  onClick={() => void apply({ type: 'review-campaign', role: 'admin', campaignId: campaign.id, decision: 'approve' }, 'Sample campaign approved.')}>Approve sample</button>
                <button type="button" disabled={busy} className="amanah-workflow-secondary"
                  onClick={() => void apply({ type: 'review-campaign', role: 'admin', campaignId: campaign.id, decision: 'request-changes' }, 'Sample campaign returned for changes.')}>Request changes</button>
              </div>
            </article>)}
            <h5>Confidential case decision queue (metadata only)</h5>
            {pendingCases.length === 0 && <p className="amanah-workflow-empty">No sample assistance cases awaiting review.</p>}
            {pendingCases.map(item => <article className="amanah-workflow-review" key={item.id}>
              <div><span>{item.id} · {item.county}</span><b>{item.need}</b><small>Status: {item.status} · No identity data available</small></div>
              <div className="amanah-workflow-review-actions">
                <button type="button" disabled={busy} onClick={() => void apply({ type: 'review-case', role: 'admin', caseId: item.id, decision: 'approved' }, 'Illustrative assistance case approved.')}>Approve</button>
                <button type="button" disabled={busy} className="amanah-workflow-secondary" onClick={() => void apply({ type: 'review-case', role: 'admin', caseId: item.id, decision: 'more-information' }, 'Mock reviewer requested more information.')}>More info</button>
                <button type="button" disabled={busy} className="amanah-workflow-secondary" onClick={() => void apply({ type: 'review-case', role: 'admin', caseId: item.id, decision: 'declined' }, 'Mock case declined.')}>Decline</button>
              </div>
            </article>)}
          </div>}

          {role === 'finance' && <form className="amanah-workflow-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void apply({ type: 'simulated-disbursement', role: 'finance', campaignId: allocationCampaign, amountKes: Number(allocationAmount) }, 'Restricted sample allocation recorded.');
          }}>
            <label className="amanah-workflow-wide">Approved sample campaign
              <select value={approvedCampaigns.some(c => c.id === allocationCampaign) ? allocationCampaign : approvedCampaigns[0]?.id || ''}
                onChange={event => setAllocationCampaign(event.target.value)} disabled={!approvedCampaigns.length}>
                {approvedCampaigns.map(row => <option key={row.id} value={row.id}>{row.title} · {givingTypeLabel(row.fundType)}</option>)}
              </select>
            </label>
            <label>Simulated release (KSh)
              <input inputMode="numeric" value={allocationAmount} onChange={event => inputCurrency(event.target.value, setAllocationAmount)} required/>
            </label>
            <button className="amanah-workflow-primary" type="submit" disabled={busy || !approvedCampaigns.length}>Record demo allocation <Icon name="arrow-right"/></button>
            <p className="amanah-workflow-footnote">The workflow rejects unapproved campaigns, cross-fund usage, insufficient balance and budget overruns. No transfer is initiated.</p>
          </form>}
        </div>

        {error && <p className="amanah-workflow-feedback amanah-workflow-error" role="alert"><Icon name="close"/>{error}</p>}
        {notice && <p className="amanah-workflow-feedback" role="status"><Icon name="check"/>{notice}</p>}

        <div className="amanah-workflow-details">
          <div className="amanah-workflow-details-heading">
            <div><h4>Financial transparency</h4><p>Sample fund movements are visible and classified by giving purpose.</p></div>
            <button type="button" onClick={() => setShowLedger(previous => !previous)} aria-expanded={showLedger}>
              {showLedger ? 'Hide ledger' : 'Inspect ledger'} <Icon name="chevron"/>
            </button>
          </div>
          <div className="amanah-workflow-campaigns" aria-label="Illustrative campaign approvals and allocations">
            {snapshot.campaigns.map(campaign =>
              <div className="amanah-workflow-campaign" key={campaign.id}>
                <div><b>{campaign.title}</b><span>{campaign.county} · {givingTypeLabel(campaign.fundType)}</span></div>
                <div><strong>{formatKes(disbursedToCampaign(snapshot, campaign.id))}</strong><small>of {formatKes(campaign.budgetKes)} sample budget</small></div>
                <span className={'amanah-workflow-status ' + (campaign.status === 'approved' ? 'is-approved' : '')}>{campaign.status}</span>
              </div>)}
          </div>
          {showLedger && <div className="amanah-workflow-table-scroll" role="region" aria-label="Read-only fictional restricted fund ledger" tabIndex={0}>
            <table className="amanah-workflow-table">
              <thead><tr><th>Entry</th><th>Giving type</th><th>Sample credit</th><th>Sample release</th><th>Reference</th></tr></thead>
              <tbody>{snapshot.ledger.map(entry => <tr key={entry.id}>
                <td>{entry.kind.replaceAll('-', ' ')}</td><td>{givingTypeLabel(entry.fundType)}</td>
                <td>{entry.kind !== 'simulated-disbursement' ? formatKes(entry.amountKes) : '—'}</td>
                <td>{entry.kind === 'simulated-disbursement' ? formatKes(entry.amountKes) : '—'}</td>
                <td>{entry.campaignId || entry.id}</td>
              </tr>)}</tbody>
            </table>
          </div>}
        </div>

        <div className="amanah-workflow-details">
          <div className="amanah-workflow-details-heading">
            <div><h4>Private case statuses and activity trail</h4><p>Only non-identifying case metadata is shown in this demo.</p></div>
            <button type="button" onClick={() => setShowAudit(previous => !previous)} aria-expanded={showAudit}>
              {showAudit ? 'Hide activity' : 'Inspect activity'} <Icon name="chevron"/>
            </button>
          </div>
          <div className="amanah-workflow-case-strip">
            {snapshot.cases.map(item => <div key={item.id}>
              <b>{item.id}</b><span>{item.need} · {item.county}</span><em>{item.status}</em>
            </div>)}
          </div>
          {showAudit && <ol className="amanah-workflow-audit">
            {snapshot.audit.length ? snapshot.audit.map(event => <li key={event.id}>
              <strong>{event.description}</strong><span>{event.role} · {event.recordId} · {new Date(event.at).toLocaleTimeString('en-KE')}</span>
            </li>) : <li>No sample actions yet. Test a workflow to generate a local activity entry.</li>}
          </ol>}
        </div>
        <div className="amanah-workflow-bottom">
          <span><Icon name="shield"/> State stays in memory · Never enter real personal or payment information</span>
          <button type="button" disabled={busy} onClick={() => void reset()}>Reset demonstration</button>
        </div>
      </div>}
    </section>
  );
}
