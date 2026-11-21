import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newDemoSnapshot, applyWorkflowCommand, fundBalance, disbursedToCampaign,
  publicWorkflowSnapshot, createMemoryWorkflowGateway,
} from '../app/workflows/workflowDomain.ts';

const base = () => newDemoSnapshot();
const pendingZakat = 'CAM-DEMO-101';
const approvedSadaqah = 'CAM-DEMO-100';

test('seeded example ledgers keep Sadaqah and Zakat amounts independent', () => {
  const state = base();
  assert.equal(fundBalance(state, 'sadaqah'), 160000);
  assert.equal(fundBalance(state, 'zakat'), 80000);
  const changed = applyWorkflowCommand(state, { type: 'simulated-gift', role: 'donor', fundType: 'zakat', amountKes: 1250 });
  assert.equal(fundBalance(changed, 'zakat'), 81250);
  assert.equal(fundBalance(changed, 'sadaqah'), 160000);
  assert.equal(fundBalance(state, 'zakat'), 80000, 'sample updates must not mutate prior state');
  assert.equal(changed.ledger.at(-1).kind, 'simulated-gift');
  assert.match(changed.audit[0].description, /no payment made/);
});

test('campaign creation is validated and enters a distinct Shariah gate for Zakat', () => {
  const state = applyWorkflowCommand(base(), {
    type: 'create-campaign', role: 'organization', title: '  A sample food campaign ',
    county: 'Wajir', fundType: 'zakat', budgetKes: 50000,
  });
  const campaign = state.campaigns[0];
  assert.equal(campaign.title, 'A sample food campaign');
  assert.equal(campaign.status, 'submitted');
  assert.equal(campaign.shariah, 'pending');
  assert.throws(() => applyWorkflowCommand(state, {
    type: 'review-campaign', role: 'admin', campaignId: campaign.id, decision: 'approve',
  }), /positive Shariah review/);
  assert.throws(() => applyWorkflowCommand(base(), {
    type: 'create-campaign', role: 'organization', title: 'x', county: 'Wajir', fundType: 'zakat', budgetKes: 50000,
  }), /title between/);
});

test('Shariah eligibility decisions must precede administrator approval', () => {
  const before = base();
  const eligible = applyWorkflowCommand(before, {
    type: 'evaluate-zakat', role: 'shariah', campaignId: pendingZakat, eligible: true,
  });
  const approved = applyWorkflowCommand(eligible, {
    type: 'review-campaign', role: 'admin', campaignId: pendingZakat, decision: 'approve',
  });
  assert.equal(approved.campaigns.find(row => row.id === pendingZakat).status, 'approved');
  assert.throws(() => applyWorkflowCommand(eligible, {
    type: 'evaluate-zakat', role: 'shariah', campaignId: pendingZakat, eligible: true,
  }), /already decided/);
  const refused = applyWorkflowCommand(before, {
    type: 'evaluate-zakat', role: 'shariah', campaignId: pendingZakat, eligible: false,
  });
  assert.throws(() => applyWorkflowCommand(refused, {
    type: 'review-campaign', role: 'admin', campaignId: pendingZakat, decision: 'approve',
  }), /positive Shariah review/);
});

test('restricted allocations respect approval, budget, and separate fund balances', () => {
  const before = base();
  assert.throws(() => applyWorkflowCommand(before, {
    type: 'simulated-disbursement', role: 'finance', campaignId: pendingZakat, amountKes: 1000,
  }), /approved campaigns/);
  const released = applyWorkflowCommand(before, {
    type: 'simulated-disbursement', role: 'finance', campaignId: approvedSadaqah, amountKes: 60000,
  });
  assert.equal(disbursedToCampaign(released, approvedSadaqah), 60000);
  assert.equal(fundBalance(released, 'sadaqah'), 100000);
  assert.equal(fundBalance(released, 'zakat'), 80000);
  assert.throws(() => applyWorkflowCommand(released, {
    type: 'simulated-disbursement', role: 'finance', campaignId: approvedSadaqah, amountKes: 85000,
  }), /remaining sample budget/);
  assert.throws(() => applyWorkflowCommand(released, {
    type: 'simulated-disbursement', role: 'finance', campaignId: approvedSadaqah, amountKes: 100001,
  }), /remaining sample budget/);
  const donor = applyWorkflowCommand(released, {
    type: 'simulated-gift', role: 'donor', fundType: 'sadaqah', amountKes: 500,
  });
  assert.equal(fundBalance(donor, 'sadaqah'), 100500);
});

test('role constraints reject unauthorized simulated transitions', () => {
  assert.throws(() => applyWorkflowCommand(base(), {
    type: 'simulated-disbursement', role: 'donor', campaignId: approvedSadaqah, amountKes: 100,
  }), /Only the finance demo/);
  assert.throws(() => applyWorkflowCommand(base(), {
    type: 'review-case', role: 'organization', caseId: 'CASE-DEMO-102', decision: 'approved',
  }), /Only the admin demo/);
  assert.throws(() => applyWorkflowCommand(base(), {
    type: 'simulated-gift', role: 'donor', fundType: 'zakat', amountKes: 0,
  }), /whole sample amount/);
});

test('assistance cases use controlled non-identifying metadata only', () => {
  const state = applyWorkflowCommand(base(), {
    type: 'submit-case', role: 'beneficiary', county: 'Wajir', need: 'Food support',
  });
  const item = state.cases[0];
  assert.deepEqual(Object.keys(item).sort(), ['county', 'id', 'need', 'status']);
  assert.equal(item.status, 'submitted');
  const returned = applyWorkflowCommand(state, {
    type: 'review-case', role: 'admin', caseId: item.id, decision: 'more-information',
  });
  const approved = applyWorkflowCommand(returned, {
    type: 'review-case', role: 'admin', caseId: item.id, decision: 'approved',
  });
  assert.equal(approved.cases.find(row => row.id === item.id).status, 'approved');
  assert.throws(() => applyWorkflowCommand(approved, {
    type: 'review-case', role: 'admin', caseId: item.id, decision: 'declined',
  }), /cannot be reviewed again/);
  assert.ok(!('cases' in publicWorkflowSnapshot(state)));
  assert.ok(!('audit' in publicWorkflowSnapshot(state)));
  assert.throws(() => applyWorkflowCommand(base(), {
    type: 'submit-case', role: 'beneficiary', county: 'Wajir', need: 'private identifiers',
  }), /fictional assistance scenarios/);
});

test('memory adapter offers swappable async contract, copy isolation and safe reset', async () => {
  const gateway = createMemoryWorkflowGateway();
  const first = await gateway.snapshot();
  first.ledger[0].amountKes = 1;
  assert.equal(fundBalance(await gateway.snapshot(), 'sadaqah'), 160000);
  await gateway.execute({ type: 'simulated-gift', role: 'donor', fundType: 'sadaqah', amountKes: 1000 });
  assert.equal(fundBalance(await gateway.snapshot(), 'sadaqah'), 161000);
  assert.equal(fundBalance(await gateway.reset(), 'sadaqah'), 160000);
});
