'use client';

import { useState } from 'react';
import Icon from './Icon';

const notices = [
  { id: 'impact', category: 'Impact', icon: 'shield', label: 'Impact verified', title: 'Clean water is now flowing in Garissa', description: 'Your WTR-284 gift now helps serve 340 people.', time: '2h', timeLabel: '2 hours ago' },
  { id: 'receipt', category: 'Payments', icon: 'wallet', label: 'Receipt ready', title: 'Your Jumu’ah Sadaqah was confirmed', description: 'KSh 500 · AMN-948231', time: 'Fri', timeLabel: 'Friday' },
  { id: 'plan', category: 'Plans', icon: 'calendar', label: 'Giving plan reminder', title: 'Last 10 nights plan begins in 5 days', description: 'Review your amount and payment method.', time: '1d', timeLabel: '1 day ago' },
  { id: 'security', category: 'Security', icon: 'shield', label: 'New sign-in protected', title: 'A sign-in from Nairobi was verified', description: 'If this was not you, secure your account.', time: '3d', timeLabel: '3 days ago' },
];
const channels = ['In-app', 'Email', 'SMS', 'WhatsApp'];
type Props = { read: string[]; onRead: (ids: string[]) => void; onClose: () => void };

export default function NotificationCenter({ read, onRead, onClose }: Props) {
  const [filter, setFilter] = useState('All');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('amanah-notification-channels') || 'null');
      return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string' && channels.includes(value)) : channels;
    } catch { return channels; }
  });
  const [savedMessage, setSavedMessage] = useState('');
  const unread = notices.filter(item => !read.includes(item.id)).length;
  const visible = notices.filter(item => filter === 'All' || item.category === filter);

  return <div className="overlay notification-overlay" role="dialog" aria-modal="true" aria-labelledby="notification-title">
    <div className="notification-panel refined-notifications">
      <button className="close" aria-label="Close notifications" onClick={onClose}><Icon name="close"/></button>
      <div className="notification-head">
        <div><p className="eyebrow">Notification center</p><h2 id="notification-title">Peace of mind, delivered.</h2></div>
        <div className="notification-summary"><span role="status">{unread ? `${unread} unread updates` : 'You’re all caught up'}</span><button disabled={!unread} onClick={() => onRead(notices.map(item => item.id))}><Icon name="✓"/>Mark all read</button></div>
      </div>
      <div className="notification-tabs" role="group" aria-label="Filter notifications">
        {['All', 'Impact', 'Payments', 'Plans'].map(category => <button key={category} className={filter === category ? 'active' : ''} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}{category === 'All' && unread > 0 && <span aria-label={`${unread} unread`}>{unread}</span>}</button>)}
      </div>
      <div className="notification-list">
        {visible.map(item => {
          const isUnread = !read.includes(item.id);
          return <article key={item.id} className={`notification-entry ${isUnread ? 'unread' : ''}`}>
            <i className={`notice-icon notice-${item.id}`}><Icon name={item.icon}/></i>
            <div className="notice-content"><div className="notice-meta"><b>{item.label}</b><time aria-label={item.timeLabel}>{item.time}</time></div><h3>{item.title}</h3><p>{item.description}</p>{isUnread && <button className="notice-read" onClick={() => onRead([...read, item.id])}>Mark as read <Icon name="✓"/></button>}</div>
            {isUnread && <span className="notice-dot" aria-label="Unread"/>}
          </article>;
        })}
      </div>
      <div className="notification-settings"><span><b>Delivery preferences</b><small>{preferences.length ? preferences.join(' · ') : 'No channels selected'}</small></span><button aria-expanded={preferencesOpen} aria-controls="notification-preferences" onClick={() => setPreferencesOpen(!preferencesOpen)}>{preferencesOpen ? 'Close' : 'Manage'}<Icon name={preferencesOpen ? 'close' : '→'}/></button></div>
      {preferencesOpen && <form id="notification-preferences" className="notice-preferences" onSubmit={event => {
        event.preventDefault();
        try { localStorage.setItem('amanah-notification-channels', JSON.stringify(preferences)); setSavedMessage('Preferences saved on this device.'); }
        catch { setSavedMessage('Could not save preferences. Please try again.'); }
      }}>
        <fieldset><legend>Choose your channels</legend><p>Saved on this device. Email, SMS and WhatsApp delivery isn’t connected yet.</p>{channels.map(channel => <label key={channel}><span>{channel}</span><input type="checkbox" checked={preferences.includes(channel)} onChange={() => { setSavedMessage(''); setPreferences(preferences.includes(channel) ? preferences.filter(value => value !== channel) : [...preferences, channel]); }}/></label>)}</fieldset>
        <button className="button" type="submit">Save preferences</button><p role="status">{savedMessage}</p>
      </form>}
    </div>
  </div>;
}
