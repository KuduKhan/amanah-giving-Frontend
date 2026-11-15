export const campaigns = [
  { id: 'WTR-284', name: 'Clean water for Garissa families', sw: 'Maji safi kwa familia za Garissa', partner: 'Al-Rahmah Community Trust', image: '/water-community.jpg', place: 'Garissa', fund: 'Sadaqah Jariyah', checked: '2026-11-03', expires: '2027-02-03', due: '2026-11-24', milestone: 'Independent water test', latest: 'Borehole drilling recorded', delay: 'Water testing follows installation of the solar pump.' },
  { id: 'FOD-541', name: 'Food packs for 250 vulnerable homes', sw: 'Vifurushi vya chakula kwa kaya 250', partner: 'Pwani Food Relief (sample partner)', image: '/food-community.jpg', place: 'Mombasa', fund: 'Zakat', checked: '2026-10-21', expires: '2027-01-21', due: '2026-11-08', milestone: 'Distribution records', latest: 'Packing list reviewed', delay: 'Distribution evidence is overdue at the sample reporting date.' },
  { id: 'EDU-390', name: 'Equip a community Qur’an learning centre', sw: 'Vifaa kwa kituo cha kujifunza Qur’ani', partner: 'Al-Rahmah Community Trust', image: '/quran-learning.jpg', place: 'Nakuru', fund: 'Sadaqah', checked: '2026-08-05', expires: '2026-11-05', due: '2026-12-02', milestone: 'Inventory and delivery record', latest: 'Supplier quotation reviewed', delay: 'New gifts are paused until verification is renewed.' },
] as const;

export type Campaign = typeof campaigns[number];
export type Status = 'pending' | 'confirmed' | 'failed' | 'reversed';
export type Gift = { id: string; campaign: string; fund: string; amount: number; status: Status; created: string; updated: string; confirmed?: string };
export type Report = { stage: 'requested' | 'submitted' | 'changes' | 'published'; evidence?: string; date: string; delivered?: string };
export const reportingDate = '2026-11-14';
export const milestones = ['Payment confirmed', 'Allocated to restricted fund', 'Release approved', 'Funds released', 'Delivery recorded', 'Evidence reviewed'] as const;
export const pilotKey = 'amanah-connected-pilot-v1';
export const currency = (value: number) => 'KSh ' + value.toLocaleString('en-KE');
export const expired = (campaign: Campaign) => campaign.expires < reportingDate;

export function emptyPilot() {
  return { gifts: [] as Gift[], unmatched: false, matched: false, approved: {} as Record<string, string>, released: {} as Record<string, string>, reports: {} as Record<string, Report>, audit: [] as { event: string; date: string }[] };
}
export type Pilot = ReturnType<typeof emptyPilot>;
export type Event =
  | { type: 'start'; id: string; campaign: string; amount: number }
  | { type: 'payment'; id: string; status: Exclude<Status, 'pending'> }
  | { type: 'flag' }
  | { type: 'reconcile'; id: string }
  | { type: 'approve' | 'release' | 'request' | 'submit' | 'changes' | 'publish'; campaign: string; evidence?: string };

export function evolve(state: Pilot, action: Event, date: string): Pilot {
  function record(next: Partial<Pilot>, event: string): Pilot {
    return { ...state, ...next, audit: [{ event, date }, ...state.audit].slice(0, 100) };
  }
  if (action.type === 'start') {
    const campaign = campaigns.find(item => item.id === action.campaign);
    if (!campaign || expired(campaign) || state.approved[campaign.id] || !Number.isSafeInteger(action.amount) || action.amount < 10 || action.amount > 100_000 || state.gifts.some(gift => gift.id === action.id || (gift.campaign === campaign.id && gift.status === 'pending'))) return state;
    const gift: Gift = { id: action.id, campaign: campaign.id, fund: campaign.fund, amount: action.amount, status: 'pending', created: date, updated: date };
    return record({ gifts: [...state.gifts, gift] }, `Payment requested · ${gift.id} · ${gift.fund}`);
  }
  if (action.type === 'payment') {
    const gift = state.gifts.find(item => item.id === action.id);
    if (!gift || (gift.status === 'pending' ? action.status === 'reversed' : gift.status !== 'confirmed' || action.status !== 'reversed' || !!state.approved[gift.campaign])) return state;
    if (action.status === 'confirmed' && state.approved[gift.campaign]) return state;
    const updated = { ...gift, status: action.status, updated: date, confirmed: action.status === 'confirmed' ? date : gift.confirmed };
    return record({ gifts: state.gifts.map(item => item.id === gift.id ? updated : item) }, `Payment ${action.status} · ${gift.id}`);
  }
  if (action.type === 'flag') return state.unmatched || state.matched ? state : record({ unmatched: true }, 'Finance exception flagged · DEMO-MP-001');
  if (action.type === 'reconcile') {
    if (!state.unmatched || !state.gifts.some(gift => gift.id === action.id && gift.status === 'confirmed')) return state;
    return record({ unmatched: false, matched: true }, `Finance matched DEMO-MP-001 to ${action.id} · original receipt retained`);
  }
  if (!('campaign' in action) || !campaigns.some(item => item.id === action.campaign)) return state;
  const campaign = action.campaign;
  const report = state.reports[campaign];
  if (action.type === 'approve') {
    if (state.approved[campaign] || state.unmatched || state.gifts.some(gift => gift.campaign === campaign && gift.status === 'pending') || !state.gifts.some(gift => gift.campaign === campaign && gift.status === 'confirmed')) return state;
    return record({ approved: { ...state.approved, [campaign]: date } }, `Admin approved restricted release · ${campaign}`);
  }
  if (action.type === 'release') {
    if (!state.approved[campaign] || state.released[campaign] || state.unmatched) return state;
    return record({ released: { ...state.released, [campaign]: date } }, `Finance recorded approved release · ${campaign}`);
  }
  const allowed = { request: !report, submit: !!state.released[campaign] && (report?.stage === 'requested' || report?.stage === 'changes'), changes: report?.stage === 'submitted', publish: report?.stage === 'submitted' && !!state.released[campaign] };
  if (!allowed[action.type]) return state;
  const stage = { request: 'requested', submit: 'submitted', changes: 'changes', publish: 'published' } as const;
  const evidence = action.type === 'submit' ? action.evidence?.trim().slice(0, 500) : report?.evidence;
  if (action.type === 'submit' && !evidence) return state;
  const delivered = action.type === 'submit' ? report?.delivered ?? date : report?.delivered;
  return record({ reports: { ...state.reports, [campaign]: { stage: stage[action.type], evidence, date, delivered } } }, `Evidence ${stage[action.type]} · ${campaign}`);
}

export function summarize(state: Pilot) {
  const received = state.gifts.filter(gift => gift.confirmed).reduce((sum, gift) => sum + gift.amount, 0);
  const returned = state.gifts.filter(gift => gift.status === 'reversed').reduce((sum, gift) => sum + gift.amount, 0);
  const released = state.gifts.filter(gift => {
    const release = state.released[gift.campaign];
    return gift.status === 'confirmed' && release && gift.confirmed && gift.confirmed <= release;
  }).reduce((sum, gift) => sum + gift.amount, 0);
  return { received, returned, released, held: received - returned - released };
}
