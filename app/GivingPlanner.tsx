'use client';

import Icon from './Icon';

import { useState } from 'react';

const occasions = [
  { id: 'jumuah', icon: '☾', title: 'Every Jumu’ah', note: 'A small gift every Friday', defaultAmount: 500 },
  { id: 'ramadan', icon: '✦', title: 'Last 10 nights', note: 'Never miss Laylat al-Qadr', defaultAmount: 1000 },
  { id: 'monthly', icon: '↻', title: 'Monthly Sadaqah', note: 'Sustainable support all year', defaultAmount: 2500 },
  { id: 'qurbani', icon: '◇', title: 'Qurbani reserve', note: 'Prepare ahead for Dhul Hijjah', defaultAmount: 1500 },
];

export default function GivingPlanner({ onClose, onCreate }: { onClose: () => void; onCreate: (amount: string, label: string) => void }) {
  const [occasion, setOccasion] = useState('jumuah');
  const selected = occasions.find(item => item.id === occasion)!;
  const [amount, setAmount] = useState('500');
  const [cause, setCause] = useState('Where most needed');
  const [reminders, setReminders] = useState(true);

  return <div className="overlay planner-overlay" role="dialog" aria-modal="true" aria-label="Giving planner">
    <div className="planner-panel">
      <button className="close" aria-label="Close giving planner" onClick={onClose}><Icon name="×"/></button>
      <div className="planner-intro"><span className="planner-orbit"><i><Icon name="☾"/></i></span><p className="eyebrow light">Your giving rhythm</p><h2>Turn good intentions into a gentle habit.</h2><p>Choose an occasion, amount and cause. You stay in control and can pause any plan at any time.</p></div>
      <div className="planner-form">
        <div className="planner-step"><span>01</span><div><b>Choose a rhythm</b><small>Plans use your local Africa/Nairobi calendar.</small></div></div>
        <div className="occasion-grid">{occasions.map(item => <button key={item.id} className={occasion === item.id ? 'selected' : ''} onClick={() => { setOccasion(item.id); setAmount(String(item.defaultAmount)); }}><i><Icon name={item.icon}/></i><span><b>{item.title}</b><small>{item.note}</small></span></button>)}</div>
        <div className="planner-step"><span>02</span><div><b>Set the gift</b><small>Funds retain the giving type selected at checkout.</small></div></div>
        <div className="planner-fields"><label><span>Amount per gift</span><div className="planner-amount"><small>KSh</small><input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,''))}/></div></label><label><span>Preferred cause</span><select value={cause} onChange={e => setCause(e.target.value)}><option>Where most needed</option><option>Water</option><option>Orphans & education</option><option>Food security</option><option>Mosques & knowledge</option></select></label></div>
        <button className="planner-toggle" role="switch" aria-checked={reminders} onClick={() => setReminders(!reminders)}><span><b>Gentle reminders</b><small>Receive a notice before each scheduled gift.</small></span><i className={reminders ? 'on' : ''}><b/></i></button>
        <div className="planner-summary"><span><small>YOUR PLAN</small><b>{selected.title}</b><em>{cause}</em></span><strong>KSh {Number(amount || 0).toLocaleString()}<small>per gift</small></strong></div>
        <button className="button full planner-create" disabled={!Number(amount)} onClick={() => onCreate(amount, selected.title)}>Continue securely <span><Icon name="↗"/></span></button>
        <p className="planner-fine">No funds move until you confirm payment in the next step.</p>
      </div>
    </div>
  </div>;
}
