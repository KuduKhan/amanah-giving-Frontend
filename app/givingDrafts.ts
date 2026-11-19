export type GivingDraft = {
  id: string; createdAt: string; amount: number; intention: string; campaign: string;
  payment: string; recurring: boolean; schedule: string; cause: string;
  reminders: boolean; anonymous: boolean; dedication: string; total: number;
};
export const DRAFT_KEY = 'amanah-giving-drafts-v1';
export function readDrafts(): GivingDraft[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    return Array.isArray(data) ? data.filter((item): item is GivingDraft => {
      if (!item || typeof item !== 'object') return false;
      const draft = item as Partial<GivingDraft>;
      return typeof draft.id === 'string' && draft.id.length > 0 && draft.id.length <= 80
        && typeof draft.createdAt === 'string' && Number.isFinite(Date.parse(draft.createdAt))
        && Number.isSafeInteger(draft.amount) && draft.amount! > 0 && draft.amount! <= 999999999
        && Number.isSafeInteger(draft.total) && draft.total! >= draft.amount! && draft.total! <= 2000000000
        && typeof draft.campaign === 'string' && draft.campaign.length > 0 && draft.campaign.length <= 200
        && typeof draft.intention === 'string' && draft.intention.length > 0 && draft.intention.length <= 80
        && typeof draft.payment === 'string' && typeof draft.schedule === 'string' && typeof draft.cause === 'string'
        && typeof draft.recurring === 'boolean' && typeof draft.reminders === 'boolean'
        && typeof draft.anonymous === 'boolean' && typeof draft.dedication === 'string';
    }) : [];
  } catch { return []; }
}
export function downloadText(filename: string, content: string, contentType = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: contentType }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function draftText(drafts: GivingDraft[]) {
  return ['AMANAH GIVING — LOCAL DRAFTS', 'Not a payment receipt. No payment or recurring instruction has been submitted.', ...drafts.map(d => [d.id, new Date(d.createdAt).toLocaleDateString('en-KE'), d.campaign, d.intention, `Gift: KSh ${d.amount.toLocaleString('en-KE')}`, `Estimated total: KSh ${d.total.toLocaleString('en-KE')}`, `Preferred method: ${d.payment}`, `Schedule: ${d.recurring ? d.schedule : 'One-time'}`, `Preferred cause: ${d.cause}`, `Reminder preference: ${d.reminders ? 'On (not activated)' : 'Off'}`, `Public identity: ${d.anonymous ? 'Anonymous' : 'Not anonymous'}`, d.dedication ? `Dedication: ${d.dedication}` : ''].filter(Boolean).join('\n'))].join('\n\n');
}
