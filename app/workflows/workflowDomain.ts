/**
 * Amanah Giving prototype domain.
 * Every record is FICTIONAL and lives only in this page's in-memory adapter.
 * No payment, financial custody, identity verification or privileged approval occurs.
 * Replace WorkflowGateway with a secured server adapter before production processing.
 */

export type WorkflowRole = 'donor' | 'beneficiary' | 'organization' | 'admin' | 'finance' | 'shariah';
export type FundType = 'sadaqah' | 'zakat';
export type County = 'Nairobi' | 'Garissa' | 'Mombasa' | 'Kilifi' | 'Wajir';
export type Need = 'Food support' | 'Education' | 'Medical support' | 'Shelter';
export type CampaignStatus = 'submitted' | 'changes-requested' | 'approved';
export type ShariahStatus = 'not-required' | 'pending' | 'eligible' | 'ineligible';
export type CaseStatus = 'submitted' | 'more-information' | 'approved' | 'declined';

export const counties: readonly County[] = ['Nairobi', 'Garissa', 'Mombasa', 'Kilifi', 'Wajir'];
export const needs: readonly Need[] = ['Food support', 'Education', 'Medical support', 'Shelter'];
export const fundTypes: readonly FundType[] = ['sadaqah', 'zakat'];

export type CampaignRecord = {
  id: string;
  title: string;
  county: County;
  fundType: FundType;
  budgetKes: number;
  status: CampaignStatus;
  shariah: ShariahStatus;
};
export type AssistanceCase = {
  id: string;
  county: County;
  need: Need;
  status: CaseStatus;
};
export type LedgerEntry = {
  id: string;
  kind: 'illustrative-opening' | 'simulated-gift' | 'simulated-disbursement';
  fundType: FundType;
  amountKes: number;
  campaignId?: string;
};
export type AuditEntry = {
  id: string;
  recordId: string;
  role: WorkflowRole;
  description: string;
  at: string;
};
export type WorkflowSnapshot = {
  campaigns: CampaignRecord[];
  cases: AssistanceCase[];
  ledger: LedgerEntry[];
  audit: AuditEntry[];
  sequence: number;
};

export type WorkflowCommand =
  | { type: 'create-campaign'; role: 'organization'; title: string; county: County; fundType: FundType; budgetKes: number }
  | { type: 'review-campaign'; role: 'admin'; campaignId: string; decision: 'approve' | 'request-changes' }
  | { type: 'revise-campaign'; role: 'organization'; campaignId: string; title: string; budgetKes: number }
  | { type: 'evaluate-zakat'; role: 'shariah'; campaignId: string; eligible: boolean }
  | { type: 'simulated-gift'; role: 'donor'; fundType: FundType; amountKes: number }
  | { type: 'simulated-disbursement'; role: 'finance'; campaignId: string; amountKes: number }
  | { type: 'submit-case'; role: 'beneficiary'; county: County; need: Need }
  | { type: 'review-case'; role: 'admin'; caseId: string; decision: 'more-information' | 'approved' | 'declined' };

export function newDemoSnapshot(): WorkflowSnapshot {
  return {
    campaigns: [
      { id: 'CAM-DEMO-100', title: 'Garissa clean water access', county: 'Garissa', fundType: 'sadaqah', budgetKes: 140000, status: 'approved', shariah: 'not-required' },
      { id: 'CAM-DEMO-101', title: 'Kilifi household assistance', county: 'Kilifi', fundType: 'zakat', budgetKes: 65000, status: 'submitted', shariah: 'pending' },
    ],
    cases: [{ id: 'CASE-DEMO-102', county: 'Mombasa', need: 'Education', status: 'submitted' }],
    ledger: [
      { id: 'LEDGER-DEMO-1', kind: 'illustrative-opening', fundType: 'sadaqah', amountKes: 160000 },
      { id: 'LEDGER-DEMO-2', kind: 'illustrative-opening', fundType: 'zakat', amountKes: 80000 },
    ],
    audit: [],
    sequence: 103,
  };
}

export function fundBalance(snapshot: WorkflowSnapshot, fundType: FundType): number {
  return snapshot.ledger.filter(row => row.fundType === fundType).reduce((balance, row) =>
    balance + (row.kind === 'simulated-disbursement' ? -row.amountKes : row.amountKes), 0);
}

export function disbursedToCampaign(snapshot: WorkflowSnapshot, campaignId: string): number {
  return snapshot.ledger.filter(row => row.kind === 'simulated-disbursement' && row.campaignId === campaignId)
    .reduce((total, row) => total + row.amountKes, 0);
}

export function publicWorkflowSnapshot(snapshot: WorkflowSnapshot): Pick<WorkflowSnapshot, 'campaigns' | 'ledger'> {
  // Never put assistance cases or internal audit metadata on a public impact route.
  return { campaigns: snapshot.campaigns.map(campaign => ({ ...campaign })),
    ledger: snapshot.ledger.map(row => ({ ...row })) };
}

function amountValid(value: number, minimum: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function guard(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function audit(snapshot: WorkflowSnapshot, role: WorkflowRole, recordId: string, description: string): WorkflowSnapshot {
  return {
    ...snapshot,
    sequence: snapshot.sequence + 1,
    audit: [{ id: 'AUD-DEMO-' + snapshot.sequence, recordId, role, description, at: new Date().toISOString() }, ...snapshot.audit].slice(0, 50),
  };
}
function nextRecordId(snapshot: WorkflowSnapshot, prefix: string): string {
  return prefix + '-DEMO-' + snapshot.sequence;
}

export function applyWorkflowCommand(snapshot: WorkflowSnapshot, command: WorkflowCommand): WorkflowSnapshot {
  switch (command.type) {
    case 'create-campaign': {
      guard(command.role === 'organization', 'Only the organization demo can submit a campaign.');
      const title = command.title.trim().replace(/\s+/g, ' ');
      guard(title.length >= 6 && title.length <= 80, 'Enter a campaign title between 6 and 80 characters.');
      guard(counties.includes(command.county) && fundTypes.includes(command.fundType), 'Select an available county and giving type.');
      guard(amountValid(command.budgetKes, 1000, 5000000), 'The sample budget must be a whole amount from KSh 1,000 to KSh 5,000,000.');
      const id = nextRecordId(snapshot, 'CAM');
      const campaign: CampaignRecord = {
        id, title, county: command.county, budgetKes: command.budgetKes, fundType: command.fundType,
        status: 'submitted', shariah: command.fundType === 'zakat' ? 'pending' : 'not-required',
      };
      return audit({ ...snapshot, campaigns: [campaign, ...snapshot.campaigns], sequence: snapshot.sequence + 1 }, command.role, id, 'Campaign submitted for sample review');
    }
    case 'revise-campaign': {
      guard(command.role === 'organization', 'Only the organization demo can revise its example campaign.');
      const campaign = snapshot.campaigns.find(row => row.id === command.campaignId);
      guard(campaign && campaign.status === 'changes-requested', 'Only campaigns returned for changes may be revised.');
      const title = command.title.trim().replace(/\s+/g, ' ');
      guard(title.length >= 6 && title.length <= 80, 'Enter a campaign title between 6 and 80 characters.');
      guard(amountValid(command.budgetKes, 1000, 5000000), 'The revised sample budget must be from KSh 1,000 to KSh 5,000,000.');
      return audit({ ...snapshot, campaigns: snapshot.campaigns.map(row =>
        row.id === campaign.id ? {
          ...row, title, budgetKes: command.budgetKes, status: 'submitted',
          shariah: row.fundType === 'zakat' ? 'pending' : 'not-required',
        } : row) }, command.role, campaign.id, 'Revised campaign resubmitted for sample verification');
    }
    case 'evaluate-zakat': {
      guard(command.role === 'shariah', 'Only the Shariah demo can evaluate Zakat eligibility.');
      const campaign = snapshot.campaigns.find(row => row.id === command.campaignId);
      guard(campaign && campaign.fundType === 'zakat' && campaign.status !== 'approved', 'Select an unapproved Zakat campaign.');
      guard(campaign.shariah === 'pending', 'This sample eligibility review is already decided.');
      return audit({ ...snapshot, campaigns: snapshot.campaigns.map(row =>
        row.id === campaign.id ? { ...row, shariah: command.eligible ? 'eligible' : 'ineligible' } : row) },
      command.role, campaign.id, command.eligible ? 'Sample Zakat eligibility marked eligible' : 'Sample Zakat eligibility marked ineligible');
    }
    case 'review-campaign': {
      guard(command.role === 'admin', 'Only the admin demo can review campaigns.');
      const campaign = snapshot.campaigns.find(row => row.id === command.campaignId);
      guard(campaign && campaign.status === 'submitted', 'Only submitted campaigns can be reviewed.');
      if (command.decision === 'approve') {
        guard(campaign.fundType !== 'zakat' || campaign.shariah === 'eligible',
          'Zakat campaigns require a positive Shariah review before admin approval.');
      }
      return audit({ ...snapshot, campaigns: snapshot.campaigns.map(row =>
        row.id === campaign.id ? { ...row, status: command.decision === 'approve' ? 'approved' : 'changes-requested' } : row) },
      command.role, campaign.id, command.decision === 'approve' ? 'Campaign approved in demo' : 'Campaign returned for changes in demo');
    }
    case 'simulated-gift': {
      guard(command.role === 'donor', 'Only the donor demo can simulate giving.');
      guard(fundTypes.includes(command.fundType), 'Select a giving type.');
      guard(amountValid(command.amountKes, 100, 1000000), 'Enter a whole sample amount from KSh 100 to KSh 1,000,000.');
      const id = nextRecordId(snapshot, 'GIFT');
      return audit({ ...snapshot, sequence: snapshot.sequence + 1,
        ledger: [...snapshot.ledger, { id, kind: 'simulated-gift', fundType: command.fundType, amountKes: command.amountKes }] },
      command.role, id, 'Fictional donation added to illustrative balance — no payment made');
    }
    case 'simulated-disbursement': {
      guard(command.role === 'finance', 'Only the finance demo can record a disbursement.');
      const campaign = snapshot.campaigns.find(row => row.id === command.campaignId);
      guard(campaign && campaign.status === 'approved', 'Only approved campaigns can receive a sample disbursement.');
      guard(campaign.fundType !== 'zakat' || campaign.shariah === 'eligible', 'Zakat requires an eligible Shariah decision.');
      guard(amountValid(command.amountKes, 1, 5000000), 'Enter a valid whole-KSh disbursement amount.');
      guard(command.amountKes <= campaign.budgetKes - disbursedToCampaign(snapshot, campaign.id), 'The request exceeds the campaign’s remaining sample budget.');
      guard(command.amountKes <= fundBalance(snapshot, campaign.fundType), 'Not enough funds in this giving type’s separate sample balance.');
      const id = nextRecordId(snapshot, 'DIS');
      return audit({ ...snapshot, sequence: snapshot.sequence + 1,
        ledger: [...snapshot.ledger, { id, kind: 'simulated-disbursement', fundType: campaign.fundType, amountKes: command.amountKes, campaignId: campaign.id }] },
      command.role, id, 'Sample disbursement recorded against approved campaign — no funds moved');
    }
    case 'submit-case': {
      guard(command.role === 'beneficiary', 'Only the beneficiary demo can submit an assistance scenario.');
      guard(counties.includes(command.county) && needs.includes(command.need), 'Choose one of the fictional assistance scenarios.');
      const id = nextRecordId(snapshot, 'CASE');
      return audit({ ...snapshot, sequence: snapshot.sequence + 1,
        cases: [{ id, county: command.county, need: command.need, status: 'submitted' }, ...snapshot.cases] },
      command.role, id, 'Anonymous sample assistance scenario submitted (no personal details)');
    }
    case 'review-case': {
      guard(command.role === 'admin', 'Only the admin demo can review sample cases.');
      const sampleCase = snapshot.cases.find(row => row.id === command.caseId);
      guard(sampleCase && (sampleCase.status === 'submitted' || sampleCase.status === 'more-information'), 'This sample case cannot be reviewed again.');
      return audit({ ...snapshot, cases: snapshot.cases.map(row =>
        row.id === sampleCase.id ? { ...row, status: command.decision } : row) },
      command.role, sampleCase.id, 'Sample case decision: ' + command.decision);
    }
  }
}

/** Swappable data boundary; the production implementation must enforce auth and approvals server-side. */
export interface WorkflowGateway {
  snapshot(): Promise<WorkflowSnapshot>;
  execute(command: WorkflowCommand): Promise<WorkflowSnapshot>;
  reset(): Promise<WorkflowSnapshot>;
}

export function createMemoryWorkflowGateway(): WorkflowGateway {
  let current = newDemoSnapshot();
  return {
    async snapshot() { return structuredClone(current); },
    async execute(command) {
      current = applyWorkflowCommand(current, command);
      return structuredClone(current);
    },
    async reset() {
      current = newDemoSnapshot();
      return structuredClone(current);
    },
  };
}
