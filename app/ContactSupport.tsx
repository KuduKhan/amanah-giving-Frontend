'use client';

import { useState, type FormEvent } from 'react';
import Icon from './Icon';
import { downloadText } from './givingDrafts';

const topics = ['Feedback or suggestion', 'Campaign question', 'Payment or receipt question', 'Privacy', 'Accessibility', 'Other'] as const;
type Topic = (typeof topics)[number];
const guidance: Record<Topic, string> = {
  'Feedback or suggestion': 'Tell us which part of the experience could be clearer or better.',
  'Campaign question': 'Mention only a publicly displayed campaign name or code, and its general location.',
  'Payment or receipt question': 'Do not retry a pending payment. Contact your payment provider through its verified channel. Never put a provider reference, phone number or payment details in this draft.',
  Privacy: 'Describe the policy concern without sharing names, identification documents or private evidence.',
  Accessibility: 'Mention the page or feature and the accessibility barrier, without adding personal or medical records.',
  Other: 'Describe the topic briefly without including sensitive or private information.',
};

export default function ContactSupport() {
  const [topic, setTopic] = useState<Topic>('Feedback or suggestion');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (cleanMessage.length < 10) {
      setStatus('Please enter at least 10 characters before saving your draft.');
      return;
    }
    try {
      downloadText(
        'amanah-feedback-draft.txt',
        `AMANAH GIVING — FEEDBACK OR SUPPORT DRAFT
Not submitted to Amanah Giving. No support ticket was opened.
Topic: ${topic}
Public campaign reference: ${reference.trim() || 'Not supplied'}

${cleanMessage}

Review this file before sharing. Do not include private payment details, documents or identification information.
`,
      );
      setStatus('Your draft has been downloaded to this device. Nothing was sent or submitted.');
    } catch {
      setStatus('The download could not start. Please try again from your browser.');
    }
  }

  return (
    <section className="support-composer" id="contact-feedback" aria-labelledby="support-title">
      <div className="contact-compose-top">
        <span className="contact-compose-symbol" aria-hidden="true"><Icon name="comment" /></span>
        <span className="contact-compose-badge"><Icon name="shield" /> Private draft</span>
      </div>
      <div className="contact-compose-heading">
        <div>
          <p className="eyebrow">Feedback and support</p>
          <h2 id="support-title">Leave feedback or ask a question.</h2>
        </div>
        <p>Prepare a clear message for your own records. Support delivery is not connected, so downloading it does <strong>not</strong> send a request or create a ticket.</p>
      </div>

      <div className="contact-data-notice" role="note">
        <Icon name="shield" />
        <p><strong>Keep private details out.</strong> Share only public campaign references. Never enter payment transaction IDs, phone numbers, card details, identity documents or confidential evidence.</p>
      </div>

      <form className="contact-form" onSubmit={prepare}>
        <div className="contact-form-grid">
          <label htmlFor="contact-topic">
            <span>What is this about?</span>
            <select
              id="contact-topic"
              value={topic}
              aria-describedby="contact-topic-help"
              onChange={event => { setTopic(event.target.value as Topic); setStatus(''); }}
            >
              {topics.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label htmlFor="contact-reference">
            <span>Public campaign reference <small>(optional)</small></span>
            <input
              id="contact-reference"
              value={reference}
              maxLength={40}
              autoComplete="off"
              aria-describedby="contact-reference-help"
              onChange={event => { setReference(event.target.value); setStatus(''); }}
              placeholder="e.g. a public campaign code"
            />
          </label>
        </div>
        <div className="contact-form-hints">
          <p id="contact-topic-help" aria-live="polite"><Icon name="support" />{guidance[topic]}</p>
          <p id="contact-reference-help">Public identifiers only; leave this blank for non-campaign topics.</p>
        </div>
        <label className="contact-message-field" htmlFor="contact-message">
          <span>Your comment or question <small>(required)</small></span>
          <textarea
            id="contact-message"
            value={message}
            aria-describedby="contact-topic-help support-message-count"
            onChange={event => { setMessage(event.target.value); setStatus(''); }}
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            placeholder="Describe the issue or suggestion in your own words…"
          />
          <small id="support-message-count" className="contact-character-count">{message.length.toLocaleString('en-KE')}/2,000 characters</small>
        </label>
        <div className="contact-form-actions">
          <button className="button" type="submit">Download message draft <Icon name="download" /></button>
          <span><Icon name="shield" /> Local file only · No message sent</span>
        </div>
        {status && <p className="contact-form-status" role="status" aria-live="polite">{status}</p>}
      </form>

      <div className="contact-help-footer">
        <span className="contact-help-footer-icon"><Icon name="book" /></span>
        <div><strong>Need an answer sooner?</strong><p>Find guidance on campaigns, giving and privacy in frequently asked questions.</p></div>
        <a href="/faq">Explore FAQs <Icon name="arrow-right" /></a>
      </div>
    </section>
  );
}
