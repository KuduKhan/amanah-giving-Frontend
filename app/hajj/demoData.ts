export const funds = [
  { id: 'pilgrim', name: 'Sponsor a pilgrim', icon: 'giving', description: 'Support a reviewed first-time pilgrim. The public record uses a sample reference to protect their identity.', reference: 'HAJ-104', raised: 390000, target: 600000 },
  { id: 'community', name: 'Community Fund', icon: 'heart', description: 'Pool Sadaqah for approved pilgrims with financial need. This fund has its own funding record.', reference: 'HAJ-CF', raised: 480000, target: 1200000 },
  { id: 'family', name: 'Family Hajj Circle', icon: 'users', description: 'Preview how relatives could fund a loved one’s journey using a separate, invitation-only record.', reference: 'HAJ-FC', raised: 240000, target: 600000 },
] as const;

export const milestones = ['Application saved', 'Sponsorship approved', 'Funding authorised', 'Preparation complete', 'Safe return confirmed', 'Expenses reconciled'] as const;

export const academy = [
  { title: 'Documents and provider', detail: 'Confirm document validity and the booking route with the authorised provider. Keep identity and health documents within the approved private process.', sw: { title: 'Nyaraka na mtoa huduma', detail: 'Thibitisha uhalali wa nyaraka na utaratibu wa kuweka nafasi kupitia mtoa huduma aliyeidhinishwa. Linda taarifa za utambulisho na afya.' } },
  { title: 'Orientation and rites', detail: 'Attend an orientation led by a qualified Hajj guide. Review the rites, the meeting points and how to reach your group leader.', sw: { title: 'Maandalizi na ibada', detail: 'Hudhuria mafunzo yanayoongozwa na mwongozo wa Hajj mwenye sifa. Jifunze taratibu za ibada, maeneo ya kukutana na jinsi ya kuwasiliana na kiongozi wa kundi.' } },
  { title: 'Travel and welfare', detail: 'Review accessibility arrangements, your itinerary, group contacts and the plan for checking in during travel and after return.', sw: { title: 'Safari na ustawi', detail: 'Kagua mipango ya ufikivu, ratiba ya safari, mawasiliano ya kundi na utaratibu wa kuwasiliana wakati wa safari na baada ya kurejea.' } },
] as const;

export type FundId = typeof funds[number]['id'];
export type Gift = { id: string; fund: FundId; amount: number; anonymous: boolean; method?: typeof paymentMethods[number] };
export type Application = { id: string; path: 'community' | 'family'; scenario: 'first-time' | 'accessibility'; stage: number };
export const paymentMethods = ['M-PESA', 'Card', 'Bank'] as const;
export const frequencies = ['Weekly', 'Monthly'] as const;
export const documentItems = ['Identity checklist reviewed', 'Provider quotation recorded', 'Visa checklist reviewed', 'Welfare plan reviewed'] as const;
export const sampleDocuments = [
  ['Sample identity review', 'Case DEMO-104 · Identity matched to the fictional applicant profile. No identity number is stored.'],
  ['Sample provider quotation', 'Quote DEMO-Q104 · KSh 600,000 · Travel, accommodation, local transport and welfare support.'],
  ['Sample visa checklist', 'Case DEMO-104 · Visa readiness checklist for a fictional traveller. No visa request was submitted.'],
  ['Sample welfare plan', 'Case DEMO-104 · Group check-ins, accessibility arrangements and return confirmation.'],
] as const;
export const sampleQuote = 600000;
export const sampleExpenses = [{ label: 'Travel and accommodation', amount: 480000 }, { label: 'Local transport', amount: 65000 }, { label: 'Orientation and welfare', amount: 25000 }] as const;
export const reconciledTotal = sampleExpenses.reduce((sum, item) => sum + item.amount, 0);
export type Extras = {
  documents: number[];
  audit: { action: string; date: string }[];
  cancelled: boolean;
  resolution: 'refund' | 'reassign' | null;
  circle: boolean;
  pledges: { fund: FundId; amount: number; frequency: typeof frequencies[number] }[];
  savings: { target: number; saved: number } | null;
  umrah: boolean;
  attached: number[];
  booking: boolean;
  caseContributions: number[];
  financeCleared: boolean;
  assistance: 'queued' | 'reviewed' | null;
};
export const emptyExtras: Extras = { documents: [], audit: [], cancelled: false, resolution: null, circle: false, pledges: [], savings: null, umrah: false, attached: [], booking: false, caseContributions: [], financeCleared: false, assistance: null };
export type Demo = { gifts: Gift[]; application: Application | null; checklist: number[]; extras: Extras };

export const emptyDemo: Demo = { gifts: [], application: null, checklist: [], extras: emptyExtras };
export const demoKey = 'amanah-hajj-demo-v1';
export const formatKes = (amount: number) => `KSh ${amount.toLocaleString('en-KE')}`;

export function parseDemo(raw: string | null): Demo {
  const data = raw ? JSON.parse(raw) as Partial<Demo> | null : null;
  if (!data || !Array.isArray(data.gifts) || !Array.isArray(data.checklist)) return emptyDemo;
  const gifts = data.gifts.filter(gift => gift && typeof gift.id === 'string' && funds.some(fund => fund.id === gift.fund) && Number.isSafeInteger(gift.amount) && gift.amount > 0 && typeof gift.anonymous === 'boolean');
  const entry = data.application;
  const application = entry && typeof entry.id === 'string' && ['community', 'family'].includes(entry.path) && ['first-time', 'accessibility'].includes(entry.scenario) && Number.isInteger(entry.stage) && entry.stage >= 0 && entry.stage < milestones.length ? entry : null;
  const extras = data.extras;
  return { gifts, application, checklist: validIndexes(data.checklist, academy.length), extras: {
    documents: validIndexes(extras?.documents, documentItems.length),
    audit: Array.isArray(extras?.audit) ? extras.audit.filter(item => typeof item?.action === 'string' && typeof item.date === 'string' && Number.isFinite(Date.parse(item.date))) : [],
    cancelled: extras?.cancelled === true && !!application,
    resolution: extras?.cancelled && (extras.resolution === 'refund' || extras.resolution === 'reassign') ? extras.resolution : null,
    circle: extras?.circle === true,
    pledges: Array.isArray(extras?.pledges) ? extras.pledges.filter(item => item && funds.some(fund => fund.id === item.fund) && validAmount(item.amount) && frequencies.includes(item.frequency)) : [],
    savings: extras?.savings && validAmount(extras.savings.target) && Number.isSafeInteger(extras.savings.saved) && extras.savings.saved >= 0 && extras.savings.saved <= extras.savings.target ? extras.savings : null,
    umrah: extras?.umrah === true,
    attached: validIndexes(extras?.attached, sampleDocuments.length),
    booking: extras?.booking === true && !!application,
    caseContributions: Array.isArray(extras?.caseContributions) ? extras.caseContributions.filter(validAmount) : application && application.stage >= 2 ? [sampleQuote] : [],
    financeCleared: extras?.financeCleared === true || !!application && application.stage >= 2,
    assistance: application && (extras?.assistance === 'queued' || extras?.assistance === 'reviewed') ? extras.assistance : null,
  } };
}

export function validAmount(amount: number) { return Number.isSafeInteger(amount) && amount > 0 && amount <= 100000000; }

function validIndexes(items: unknown, length: number): number[] {
  return Array.isArray(items) ? [...new Set(items.filter(index => Number.isInteger(index) && index >= 0 && index < length))] : [];
}

export function addAudit(extras: Extras, action: string): Extras {
  return { ...extras, audit: [...extras.audit, { action, date: new Date().toISOString() }] };
}
