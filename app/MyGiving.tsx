'use client';

import Image from 'next/image';
import Link from 'next/link';
import Icon from './Icon';
import { downloadText, draftText, type GivingDraft } from './givingDrafts';

type SavedCause = { id: string; title: string; image: string; meta: string };
type Props = {
  drafts: GivingDraft[];
  saved: SavedCause[];
  onClose: () => void;
  onView: (id: string) => void;
  onRemove: (id: string) => void;
  onGive: () => void;
  onPlan: () => void;
  onNotifications: () => void;
};

export default function MyGiving({ drafts, saved, onClose, onView, onRemove, onGive, onPlan, onNotifications }: Props) {
  const total = drafts.reduce((sum, draft) => sum + draft.amount, 0);
  const stats = [
    ['wallet', 'Draft gift value', `KSh ${total.toLocaleString('en-KE')}`, 'Not yet donated'],
    ['receipt', 'Giving drafts', drafts.length, 'On this device'],
    ['calendar', 'Plan drafts', drafts.filter(draft => draft.recurring).length, 'Not activated'],
    ['heart', 'Saved causes', saved.length, 'Ready to revisit'],
  ] as const;
  const actions = [
    ['giving', 'Prepare a gift', onGive],
    ['calendar', 'Plan regular giving', onPlan],
    ['settings', 'Notification preferences', onNotifications],
  ] as const;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="my-giving-title">
      <div className="dashboard-panel premium-dashboard my-giving">
        <button className="close" aria-label="Close My Giving" onClick={onClose}><Icon name="close"/></button>
        <header className="dashboard-welcome">
          <div>
            <p className="eyebrow">My Giving</p>
            <h2 id="my-giving-title">Your intentions, kept together.</h2>
            <p className="giving-device"><Icon name="shield"/> Saved on this device <span aria-hidden="true">·</span> No confirmed payments</p>
          </div>
          <button type="button" disabled={!drafts.length} onClick={() => downloadText('amanah-giving-drafts.txt', draftText(drafts))}>
            <Icon name="download"/>Export drafts
          </button>
        </header>

        <dl className="dashboard-stats" aria-label="Your giving at a glance">
          {stats.map(([icon, label, value, detail]) => (
            <div key={label}>
              <dt><Icon name={icon}/>{label}</dt>
              <dd><b>{value}</b><small>{detail}</small></dd>
            </div>
          ))}
        </dl>

        <div className="dashboard-actions" role="group" aria-label="Giving shortcuts">
          {actions.map(([icon, label, action], index) => (
            <button key={label} type="button" className={index === 0 ? 'button' : undefined} onClick={action}>
              <Icon name={icon}/><span>{label}</span><Icon name="chevron"/>
            </button>
          ))}
        </div>

        <p className="preview-note"><Link className="text-link" href="/pilot#pilot-impact" onClick={onClose}>Find sample receipts and impact records <Icon name="arrow-right"/></Link></p>

        <div className="giving-library">
          <section className="giving-collection" aria-labelledby="saved-causes-title">
            <h3 id="saved-causes-title"><Icon name="heart"/>Saved causes</h3>
            {saved.length ? <div className="saved-campaigns">{saved.map(cause => (
              <article key={cause.id}>
                <Image src={cause.image} alt="" width={100} height={80}/>
                <div><b>{cause.title}</b><small>{cause.meta}</small><button className="text-link" onClick={() => onView(cause.id)}>View campaign <Icon name="arrow-right"/></button></div>
                <button className="saved-remove" aria-label={`Remove saved ${cause.title}`} onClick={() => onRemove(cause.id)}><Icon name="close"/></button>
              </article>
            ))}</div> : (
              <div className="giving-empty">
                <strong>No saved causes yet</strong>
                <p>Tap the heart on a campaign to keep it here for later.</p>
                <a className="text-link" href="#causes" onClick={() => { onClose(); requestAnimationFrame(() => document.getElementById('causes-title')?.focus({ preventScroll: true })); }}>
                  Explore causes <Icon name="arrow-right"/>
                </a>
              </div>
            )}
          </section>

          <section className="giving-collection local-drafts" aria-labelledby="drafts-title">
            <h3 id="drafts-title"><Icon name="receipt"/>Giving drafts</h3>
            <p className="giving-collection-note">Drafts are plans, not receipts. No payment or recurring instruction has been sent.</p>
            {drafts.length ? drafts.map(draft => (
              <article key={draft.id}>
                <div><b>{draft.campaign}</b><small>{draft.id} · {new Date(draft.createdAt).toLocaleDateString('en-KE')}</small><span>{draft.intention} · KSh {draft.amount.toLocaleString('en-KE')} · {draft.recurring ? draft.schedule : 'One-time'}</span></div>
                <button className="text-link" onClick={() => downloadText(`${draft.id}.txt`, draftText([draft]))}>Download draft <Icon name="download"/></button>
              </article>
            )) : (
              <div className="giving-empty">
                <strong>No giving drafts yet</strong>
                <p>Your draft will appear here once you review and save it.</p>
                <button className="text-link" onClick={onGive}>Prepare your first gift <Icon name="arrow-right"/></button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
