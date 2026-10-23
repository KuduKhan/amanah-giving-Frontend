export type GivingDraft = {
  id: string; createdAt: string; amount: number; intention: string; campaign: string;
  payment: string; recurring: boolean; schedule: string; cause: string;
  reminders: boolean; anonymous: boolean; dedication: string; total: number;
};
export const DRAFT_KEY = 'amanah-giving-drafts-v1';
export function readDrafts(): GivingDraft[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    return Array.isArray(data) ? data.filter((item): item is GivingDraft => !!item && typeof item === 'object' && typeof item.id === 'string' && typeof item.createdAt === 'string' && typeof item.amount === 'number' && typeof item.campaign === 'string' && typeof item.intention === 'string' && typeof item.total === 'number') : [];
  } catch { return []; }
}
export function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function draftText(drafts: GivingDraft[]) {
  return ['AMANAH GIVING — LOCAL DRAFTS', 'Not a payment receipt. No payment or recurring instruction has been submitted.', ...drafts.map(d => [d.id, new Date(d.createdAt).toLocaleDateString('en-KE'), d.campaign, d.intention, `Gift: KSh ${d.amount.toLocaleString('en-KE')}`, `Estimated total: KSh ${d.total.toLocaleString('en-KE')}`, `Preferred method: ${d.payment}`, `Schedule: ${d.recurring ? d.schedule : 'One-time'}`, `Preferred cause: ${d.cause}`, `Reminder preference: ${d.reminders ? 'On (not activated)' : 'Off'}`, `Public identity: ${d.anonymous ? 'Anonymous' : 'Not anonymous'}`, d.dedication ? `Dedication: ${d.dedication}` : ''].filter(Boolean).join('\n'))].join('\n\n');
}
