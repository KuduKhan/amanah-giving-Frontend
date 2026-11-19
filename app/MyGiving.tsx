'use client';

import Image from 'next/image';
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
    ['receipt', 'Giving drafts', drafts.length, 'Saved on this device'],
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
      <div className="dashboard-panel premium-dashboard my-giving my-giving-v2">
        <button type="button" className="close" aria-label="Close My Giving" onClick={onClose}><Icon name="close"/></button>

        <header className="dashboard-welcome my-giving-hero">
          <div className="my-giving-hero-copy">
            <p className="my-giving-kicker"><span className="my-giving-kicker-symbol" aria-hidden="true"><Icon name="heart"/></span> MY GIVING <span className="my-giving-kicker-rule" aria-hidden="true"/> PERSONAL SPACE</p>
            <h2 id="my-giving-title">Your intentions, kept together.</h2>
            <p className="my-giving-intro">A calm place to keep meaningful causes, prepare gifts and revisit plans.</p>
            <div className="my-giving-trust" role="note" aria-label="Device storage and payment status">
              <span><Icon name="shield"/> Saved on this device</span>
              <span><Icon name="receipt"/> Drafts only · no confirmed payments</span>
            </div>
          </div>
          <button
            className="my-giving-export"
            type="button"
            disabled={!drafts.length}
            aria-label={drafts.length ? `Export ${drafts.length} saved giving drafts` : 'Export drafts, available after saving a draft'}
            onClick={() => downloadText('amanah-giving-drafts.txt', draftText(drafts))}
          >
            <Icon name="download"/><span>Export drafts</span>
          </button>
        </header>

        <section className="my-giving-overview" aria-label="Your giving at a glance">
          <div className="my-giving-section-heading">
            <p>YOUR OVERVIEW</p>
            <span>Local drafts & saved causes</span>
          </div>
          <dl className="dashboard-stats my-giving-stats">
            {stats.map(([icon, label, value, detail], index) => (
              <div key={label} className={index === 0 ? 'my-giving-stat my-giving-stat-primary' : 'my-giving-stat'}>
                <dt><span className="my-giving-stat-icon"><Icon name={icon}/></span><span>{label}</span></dt>
                <dd><b>{value}</b><small>{detail}</small></dd>
                <span className="my-giving-stat-accent" aria-hidden="true"/>
              </div>
            ))}
          </dl>
        </section>

        <section className="my-giving-shortcuts" aria-label="Giving shortcuts">
          <div className="my-giving-section-heading">
            <p>QUICK ACTIONS</p>
            <span>Continue when you&apos;re ready</span>
          </div>
          <div className="dashboard-actions my-giving-actions">
            {actions.map(([icon, label, action], index) => (
              <button key={label} type="button" className={index === 0 ? 'button my-giving-primary-action' : 'my-giving-secondary-action'} onClick={action}>
                <span className="my-giving-action-icon"><Icon name={icon}/></span>
                <span className="my-giving-action-label">{label}</span>
                <Icon name="chevron"/>
              </button>
            ))}
          </div>
        </section>

        <div className="giving-library my-giving-library">
          <section className="giving-collection my-giving-collection" aria-labelledby="saved-causes-title">
            <div className="my-giving-collection-heading">
              <div>
                <h3 id="saved-causes-title"><span className="my-giving-collection-icon"><Icon name="heart"/></span>Saved causes</h3>
                <p>Causes you want to revisit</p>
              </div>
              <span className="my-giving-count">{saved.length} saved</span>
            </div>
            {saved.length ? <div className="saved-campaigns my-giving-saved-campaigns">{saved.map(cause => (
              <article key={cause.id}>
                <Image src={cause.image} alt="" width={100} height={80}/>
                <div><b>{cause.title}</b><small>{cause.meta}</small><button type="button" className="text-link" onClick={() => onView(cause.id)}>View campaign <Icon name="arrow-right"/></button></div>
                <button type="button" className="saved-remove" aria-label={`Remove saved ${cause.title}`} onClick={() => onRemove(cause.id)}><Icon name="close"/></button>
              </article>
            ))}</div> : (
              <div className="giving-empty my-giving-empty">
                <span className="my-giving-empty-symbol" aria-hidden="true"><Icon name="heart"/></span>
                <strong>No saved causes yet</strong>
                <p>Found a cause that speaks to you? Tap its heart to keep it here for later.</p>
                <a className="text-link my-giving-empty-link" href="#causes" onClick={() => { onClose(); requestAnimationFrame(() => document.getElementById('causes-title')?.focus({ preventScroll: true })); }}>
                  Explore causes <Icon name="arrow-right"/>
                </a>
              </div>
            )}
          </section>

          <section className="giving-collection local-drafts my-giving-collection" aria-labelledby="drafts-title">
            <div className="my-giving-collection-heading">
              <div>
                <h3 id="drafts-title"><span className="my-giving-collection-icon"><Icon name="receipt"/></span>Giving drafts</h3>
                <p>Ideas for future giving</p>
              </div>
              <span className="my-giving-count">{drafts.length} saved</span>
            </div>
            <p className="giving-collection-note my-giving-draft-disclaimer"><Icon name="shield"/> Drafts are not receipts. No payment or recurring instruction has been submitted.</p>
            {drafts.length ? <div className="my-giving-drafts-list">{drafts.map(draft => (
              <article key={draft.id}>
                <div><b>{draft.campaign}</b><small>{draft.id} · {new Date(draft.createdAt).toLocaleDateString('en-KE')}</small><span>{draft.intention} · KSh {draft.amount.toLocaleString('en-KE')} · {draft.recurring ? draft.schedule : 'One-time'}</span></div>
                <button type="button" className="text-link" onClick={() => downloadText(`${draft.id}.txt`, draftText([draft]))}>Download draft <Icon name="download"/></button>
              </article>
            ))}</div> : (
              <div className="giving-empty my-giving-empty">
                <span className="my-giving-empty-symbol" aria-hidden="true"><Icon name="receipt"/></span>
                <strong>No giving drafts yet</strong>
                <p>When you review and save a gift, your draft will appear here. No payment is made.</p>
                <button type="button" className="text-link my-giving-empty-link" onClick={onGive}>Prepare your first gift <Icon name="arrow-right"/></button>
              </div>
            )}
          </section>
        </div>

        <p className="my-giving-privacy-note"><Icon name="shield"/> Drafts and saved causes live in this browser, not an online giving account. Export drafts before clearing browser data.</p>
      </div>
    </div>
  );
}
