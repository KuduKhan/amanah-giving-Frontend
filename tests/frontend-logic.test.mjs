import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDemo, funds, parseDemo, sampleQuote, validAmount } from '../app/hajj/demoData.ts';
import { draftText, readDrafts, DRAFT_KEY } from '../app/givingDrafts.ts';

const serialize = value => JSON.stringify(value);
const sampleGift = (id, fund, amount) => ({ id, fund, amount, anonymous: true, method: 'M-PESA' });
const application = (stage = 0) => ({
  id: 'HAJ-A-TEST', path: 'community', scenario: 'first-time', stage,
});

test('fresh, corrupted, or malformed Hajj demo data resets safely', () => {
  assert.deepEqual(parseDemo(null), emptyDemo);
  assert.deepEqual(parseDemo('{invalid-json'), emptyDemo);
  assert.deepEqual(parseDemo('[]'), emptyDemo);
  assert.deepEqual(parseDemo(serialize({ gifts: 'bad', checklist: [] })), emptyDemo);
});

test('Hajj sample fund gifts cannot exceed each fund target or duplicate IDs', () => {
  const remaining = funds[0].target - funds[0].raised;
  const restored = parseDemo(serialize({
    gifts: [
      sampleGift('gift-a', 'pilgrim', remaining - 1000),
      sampleGift('gift-b', 'pilgrim', 2000),
      sampleGift('gift-a', 'pilgrim', 500),
      sampleGift('gift-c', 'invalid-fund', 100),
      sampleGift('gift-d', 'pilgrim', 1000),
      sampleGift('gift-e', 'pilgrim', -2),
    ], checklist: [],
  }));
  assert.deepEqual(restored.gifts.map(x => x.id), ['gift-a', 'gift-d']);
  assert.equal(restored.gifts.reduce((sum, x) => sum + x.amount, 0), remaining);
  assert.ok(restored.gifts.every(x => x.fund === 'pilgrim'));
});

test('restored Hajj checklist indexes remain unique and in range', () => {
  const demo = parseDemo(serialize({ gifts: [], checklist: [-1, 1, 1, 2, 99, null, '0'] }));
  assert.deepEqual(demo.checklist, [1, 2]);
});

test('inconsistent case contributions do not overfund or grant finance approval', () => {
  const demo = parseDemo(serialize({
    gifts: [], checklist: [], application: application(1),
    extras: { caseContributions: [500000, 200000], financeCleared: true, booking: true },
  }));
  assert.deepEqual(demo.extras.caseContributions, [500000]);
  assert.equal(demo.extras.financeCleared, false);
  assert.equal(demo.extras.booking, true);
});

test('fully funded case allows stored finance approval; legacy progressed case remains readable', () => {
  const fullyFunded = parseDemo(serialize({
    gifts: [], checklist: [], application: application(1),
    extras: { caseContributions: [250000, sampleQuote - 250000], financeCleared: true },
  }));
  assert.equal(fullyFunded.extras.financeCleared, true);
  assert.equal(fullyFunded.extras.caseContributions.reduce((a, b) => a + b, 0), sampleQuote);
  const legacy = parseDemo(serialize({ gifts: [], checklist: [], application: application(3) }));
  assert.deepEqual(legacy.extras.caseContributions, [sampleQuote]);
  assert.equal(legacy.extras.financeCleared, true);
});

test('cancellation and reviewer outcomes require an application', () => {
  const demo = parseDemo(serialize({
    gifts: [], checklist: [],
    extras: { cancelled: true, resolution: 'refund', assistance: 'reviewed', booking: true },
  }));
  assert.equal(demo.extras.cancelled, false);
  assert.equal(demo.extras.resolution, null);
  assert.equal(demo.extras.assistance, null);
  assert.equal(demo.extras.booking, false);
});

test('only valid whole-shilling simulation amounts are accepted', () => {
  assert.equal(validAmount(1), true);
  assert.equal(validAmount(100000000), true);
  assert.equal(validAmount(0), false);
  assert.equal(validAmount(-2), false);
  assert.equal(validAmount(1.5), false);
  assert.equal(validAmount(Infinity), false);
  assert.equal(validAmount(Number.NaN), false);
  assert.equal(validAmount(100000001), false);
});

const validDraft = {
  id: 'DRAFT-ABC12345',
  createdAt: '2026-11-19T12:00:00.000Z',
  amount: 5000,
  total: 5090,
  intention: 'Sadaqah',
  campaign: 'Public campaign',
  payment: 'M-PESA',
  recurring: false,
  schedule: 'Monthly',
  cause: 'Water',
  reminders: false,
  anonymous: true,
  dedication: '',
};

function withStorage(value, callback) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: key => key === DRAFT_KEY ? value : null },
  });
  try { return callback(); }
  finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
}

test('giving drafts recover safely after malformed browser data', () => {
  assert.deepEqual(withStorage('{broken', readDrafts), []);
  assert.deepEqual(withStorage(serialize({ id: 'wrong-root' }), readDrafts), []);
});

test('giving draft restores only valid saved values and never impossible totals', () => {
  const invalidAmount = { ...validDraft, id: 'BAD-NEGATIVE', amount: -500 };
  const impossibleTotal = { ...validDraft, id: 'BAD-TOTAL', total: -1 };
  const invalidDate = { ...validDraft, id: 'BAD-DATE', createdAt: 'never' };
  const missingFields = { ...validDraft, id: 'BAD-MISSING', recurring: undefined };
  const raw = serialize([invalidAmount, impossibleTotal, invalidDate, missingFields, validDraft]);
  const restored = withStorage(raw, readDrafts);
  assert.deepEqual(restored, [validDraft]);
});

test('draft export clearly distinguishes a planned gift from a payment receipt', () => {
  const content = draftText([validDraft]);
  assert.match(content, /Not a payment receipt/);
  assert.match(content, /No payment or recurring instruction has been submitted/);
  assert.match(content, /KSh 5,000/);
});
