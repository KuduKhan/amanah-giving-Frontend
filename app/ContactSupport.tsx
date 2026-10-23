'use client';
import { useState, type FormEvent } from 'react';
import Icon from './Icon';
import { downloadText } from './givingDrafts';
export default function ContactSupport() {
  const [topic, setTopic] = useState('Campaign question');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  function prepare(event: FormEvent) {
    event.preventDefault();
    downloadText('amanah-support-request.txt', `AMANAH GIVING — SUPPORT REQUEST DRAFT\nNot submitted.\nTopic: ${topic}\nPublic campaign reference: ${reference || 'Not supplied'}\n\n${message.trim()}\n`);
    setReady(true);
  }
  return <section className="support-composer" aria-labelledby="support-title"><p className="eyebrow">Prepare a support request</p><h2 id="support-title">Keep your question ready.</h2><p>Live support delivery is not connected in this preview. Download a message draft for your records. Include only a public campaign reference; leave out payment details and private documents.</p><form onSubmit={prepare}><label><span>Topic</span><select value={topic} onChange={e => { setTopic(e.target.value); setReady(false); }}>{['Campaign question','Payment or receipt question','Privacy','Accessibility','Other'].map(t => <option key={t}>{t}</option>)}</select></label><label><span>Campaign reference <small>(optional)</small></span><input value={reference} maxLength={40} onChange={e => { setReference(e.target.value); setReady(false); }} placeholder="For example, WTR-284"/></label><label><span>Your question</span><textarea aria-label="Your question" aria-describedby="support-message-count" value={message} onChange={e => { setMessage(e.target.value); setReady(false); }} required minLength={10} maxLength={2000} rows={5} placeholder="Describe what you need help with…"/><small id="support-message-count">{message.length}/2,000 characters</small></label><button className="button" type="submit">Download message draft <Icon name="download"/></button><p role="status">{ready ? 'Message draft downloaded. It has not been sent to Amanah Giving.' : ''}</p></form><a className="text-link" href="/faq">Check frequently asked questions <Icon name="→"/></a></section>;
}
