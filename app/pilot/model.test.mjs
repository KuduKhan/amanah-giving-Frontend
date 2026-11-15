import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyPilot, evolve, summarize } from './model.ts';

const campaign = 'WTR-284';
const date = '2026-11-15T10:00:00.000Z';
const start = (id, selected = campaign) => ({ type: 'start', id, campaign: selected, amount: 500 });
const apply = (state, event) => evolve(state, event, date);

test('expired campaigns and repeated attempts cannot create duplicate pending gifts or receipts', () => {
  const initial = emptyPilot();
  assert.equal(apply(initial, start('expired', 'EDU-390')), initial);
  const pending = apply(initial, start('gift'));
  assert.equal(apply(pending, start('another')), pending);
  const confirmation = { type: 'payment', id: 'gift', status: 'confirmed' };
  const confirmed = apply(pending, confirmation);
  assert.equal(apply(confirmed, confirmation), confirmed);
  assert.equal(confirmed.gifts.filter(gift => gift.confirmed).length, 1);
  const reversed = apply(confirmed, { type: 'payment', id: 'gift', status: 'reversed' });
  assert.deepEqual(summarize(reversed), { received: 500, returned: 500, held: 0, released: 0 });
  const failed = apply(apply(reversed, start('retry')), { type: 'payment', id: 'retry', status: 'failed' });
  assert.equal(apply(failed, { ...confirmation, id: 'retry' }), failed);
  assert.deepEqual(summarize(failed), summarize(reversed));
});

test('a reconciled gift needs separate release and evidence review', () => {
  let state = apply(emptyPilot(), start('gift'));
  state = apply(state, { type: 'payment', id: 'gift', status: 'confirmed' });
  state = apply(state, { type: 'flag' });
  assert.equal(apply(state, { type: 'approve', campaign }), state);
  assert.equal(apply(state, { type: 'reconcile', id: 'unknown' }), state);
  state = apply(state, { type: 'reconcile', id: 'gift' });
  assert.equal(state.gifts.length, 1);
  assert.equal(apply(state, { type: 'release', campaign }), state);
  state = apply(state, { type: 'approve', campaign });
  assert.equal(summarize(state).held, 500);
  state = apply(state, { type: 'request', campaign });
  const submit = { type: 'submit', campaign, evidence: 'Sample lab results' };
  assert.equal(apply(state, submit), state);
  state = apply(state, { type: 'release', campaign });
  assert.deepEqual(summarize(state), { received: 500, returned: 0, held: 0, released: 500 });
  state = apply(state, submit);
  state = apply(state, { type: 'changes', campaign });
  assert.equal(apply(state, { type: 'publish', campaign }), state);
  state = apply(state, submit);
  state = apply(state, { type: 'publish', campaign });
  assert.equal(state.reports[campaign].stage, 'published');
  assert.equal(state.reports[campaign].delivered, date);
});
