'use client';
import { useState, type FormEvent } from 'react';
import Icon from './Icon';
import { downloadText } from './givingDrafts';
export default function ContactSupport() {
  const [topic, setTopic] = useState('Feedback or suggestion');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  function prepare(event: FormEvent) {
    event.preventDefault();
    downloadText('amanah-feedback-draft.txt', `AMANAH GIVING — FEEDBACK OR SUPPORT REQUEST DRAFT\nNot submitted.\nTopic: ${topic}\nPublic campaign reference: ${reference || 'Not supplied'}\n\n${message.trim()}\n`);
    setReady(true);
  }
  return <section className="support-composer" aria-labelledby="support-title"><p className="eyebrow">Feedback and support</p><h2 id="support-title">Leave feedback or a question.</h2><p>Live message delivery is not connected in this preview. Download a draft for your records. Include only a public campaign reference; leave out payment details and private documents.</p><form onSubmit={prepare}><label><span>Topic</span><select value={topic} onChange={e => { setTopic(e.target.value); setReady(false); }}>{['Feedback or suggestion','Campaign question','Payment or receipt question','Privacy','Accessibility','Other'].map(t => <option key={t}>{t}</option>)}</select></label><label><span>Campaign reference <small>(optional)</small></span><input value={reference} maxLength={40} onChange={e => { setReference(e.target.value); setReady(false); }} placeholder="For example, WTR-284"/></label><label><span>Your comment or question</span><textarea aria-label="Your comment or question" aria-describedby="support-message-count" value={message} onChange={e => { setMessage(e.target.value); setReady(false); }} required minLength={10} maxLength={2000} rows={5} placeholder="Share a comment, idea, or question…"/><small id="support-message-count">{message.length}/2,000 characters</small></label><button className="button" type="submit">Download message draft <Icon name="download"/></button><p role="status">{ready ? 'Message draft downloaded. It has not been sent to Amanah Giving.' : ''}</p></form><a className="text-link" href="/faq">Check frequently asked questions <Icon name="→"/></a></section>;
}
