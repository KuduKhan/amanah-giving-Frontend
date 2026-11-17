'use client';

import { useState } from 'react';
import Icon from './Icon';
import FooterBrandIcon from './FooterBrandIcon';

const notices = [
  { id: 'impact', category: 'Impact', icon: 'shield', label: 'Impact verified', title: 'Clean water is now flowing in Garissa', description: 'Example WTR-183 update: completed delivery serves 340 people.', time: '2h', timeLabel: '2 hours ago' },
  { id: 'receipt', category: 'Payments', icon: 'wallet', label: 'Receipt ready', title: 'Your Jumu’ah Sadaqah was confirmed', description: 'KSh 500 · AMN-948231', time: 'Fri', timeLabel: 'Friday' },
  { id: 'plan', category: 'Plans', icon: 'calendar', label: 'Giving plan reminder', title: 'Last 10 nights plan begins in 5 days', description: 'Review your amount and payment method.', time: '1d', timeLabel: '1 day ago' },
  { id: 'security', category: 'Security', icon: 'shield', label: 'New sign-in protected', title: 'A sign-in from Nairobi was verified', description: 'If this was not you, secure your account.', time: '3d', timeLabel: '3 days ago' },
];
const channels = ['In-app', 'Email', 'SMS', 'WhatsApp'];

function NotificationChannelIcon({ channel }: { channel: string }) {
  if (channel === 'WhatsApp') return <FooterBrandIcon brand="whatsapp" className="notification-channel-mark notification-channel-whatsapp"/>;
  const name = channel === 'In-app' ? 'bell' : channel === 'Email' ? 'mail' : 'sms';
  return <Icon name={name} className={`notification-channel-mark notification-channel-${name}`}/>;
}
type Props = { read: string[]; onRead: (ids: string[]) => void; readError: string; onClose: () => void };

export default function NotificationCenter({ read, onRead, readError, onClose }: Props) {
  const [filter, setFilter] = useState('All');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('amanah-notification-channels') || 'null');
      return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string' && channels.includes(value)) : channels;
    } catch { return channels; }
  });
  const [draftChannels, setDraftChannels] = useState(preferences);
  const [savedMessage, setSavedMessage] = useState('');
  const unread = notices.filter(item => !read.includes(item.id)).length;
  const visible = notices.filter(item => filter === 'All' || item.category === filter);

  return <div className="overlay notification-overlay" role="dialog" aria-modal="true" aria-labelledby="notification-title">
    <div className="notification-panel refined-notifications notification-center-compact">
      <div className="notification-head">
        <button className="close" type="button" aria-label="Close notifications" onClick={onClose}><Icon name="close"/></button>
        <p className="eyebrow">Notification center</p>
        <h2 id="notification-title">Peace of mind, delivered.</h2>
        <p className="preview-caption notification-disclosure" role="note">Example updates · no live account or payment activity</p>
        <div className="notification-summary notification-toolbar">
          <span role="status" tabIndex={-1} data-unread={unread > 0}>{unread ? `${unread} unread ${unread === 1 ? 'update' : 'updates'}` : 'You’re all caught up'}</span>
          <button type="button" disabled={!unread} onClick={event => {
            event.currentTarget.parentElement?.querySelector<HTMLElement>('[role="status"]')?.focus();
            onRead(notices.map(item => item.id));
          }}><Icon name="check"/>Mark all read</button>
        </div>
        {readError && <p className="form-error" role="status">{readError}</p>}
      </div>
      <div className="notification-tabs notification-filters" role="group" aria-label="Filter notifications">
        {['All', 'Impact', 'Payments', 'Plans'].map(category => <button type="button" key={category} className={filter === category ? 'active' : ''} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}{category === 'All' && unread > 0 && <span aria-label={`${unread} unread`}>{unread}</span>}</button>)}
      </div>
      <div className="notification-scroll">
      <div className="notification-list">
        {visible.map(item => {
          const isUnread = !read.includes(item.id);
          return <article key={item.id} tabIndex={-1} className={`notification-entry notification-item ${isUnread ? 'unread' : ''}`}>
            <i className={`notice-icon notice-${item.id}`}><Icon name={item.icon}/></i>
            <div className="notice-content">
              <div className="notice-meta"><b>{isUnread && <span className="notice-dot"><span className="sr-only">Unread: </span></span>}{item.label}</b><time aria-label={item.timeLabel}>{item.time}</time></div>
              <h3>{item.title}</h3><p>{item.description}</p>
            </div>
            {isUnread && <button className="notice-read" type="button" aria-label={`Mark as read: ${item.title}`} onClick={event => {
              event.currentTarget.closest('article')?.focus({ preventScroll: true });
              onRead([...read, item.id]);
            }}><Icon name="check"/>Mark as read</button>}
          </article>;
        })}
      </div>
      <div className="notification-settings">
        <Icon name="settings"/>
        <span className="notification-settings-copy"><b>Delivery preferences</b></span>
        <button type="button" aria-expanded={preferencesOpen} aria-controls="notification-preferences" onClick={() => {
          if (!preferencesOpen) { setDraftChannels(preferences); setSavedMessage(''); }
          setPreferencesOpen(!preferencesOpen);
        }}>{preferencesOpen ? 'Close' : 'Manage'}<Icon name={preferencesOpen ? 'close' : 'chevron'}/></button>
        {!preferencesOpen && (
          <div className="notification-saved-channels" aria-label="Saved delivery preferences">
            {preferences.length ? preferences.map(channel => (
              <span className="notification-saved-channel" key={channel}><NotificationChannelIcon channel={channel}/><span className="notification-saved-channel-label">{channel}</span></span>
            )) : <span className="notification-no-channels">No channels selected</span>}
          </div>
        )}
      </div>
      <form id="notification-preferences" className="notice-preferences notification-preferences-panel" aria-label="Notification delivery preferences" hidden={!preferencesOpen} onSubmit={event => {
        event.preventDefault();
        try {
          localStorage.setItem('amanah-notification-channels', JSON.stringify(draftChannels));
          setPreferences(draftChannels);
          setSavedMessage('Preferences saved on this device.');
        }
        catch { setSavedMessage('Could not save preferences. Please try again.'); }
      }}>
        <fieldset aria-describedby="notification-delivery-note">
          <legend>Choose your channels</legend>
          <p id="notification-delivery-note">Saved on this device. Email, SMS and WhatsApp delivery isn’t connected yet.</p>
          <div className="notice-channels">
            {channels.map(channel => <label className="notification-channel-choice" key={channel}><NotificationChannelIcon channel={channel}/><span className="notification-channel-label">{channel}</span><input type="checkbox" aria-label={`Enable ${channel} notifications`} checked={draftChannels.includes(channel)} onChange={event => {
              const checked = event.target.checked;
              setSavedMessage('');
              setDraftChannels(current => channels.filter(value => value === channel ? checked : current.includes(value)));
            }}/></label>)}
          </div>
        </fieldset>
        <div className="notice-preferences-footer notification-preferences-actions"><button className="button" type="submit">Save preferences</button><p role="status">{savedMessage}</p></div>
      </form>
      </div>
    </div>
  </div>;
}
