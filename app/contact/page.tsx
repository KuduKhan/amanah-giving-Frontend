import type { Metadata } from 'next';
import ContactSupport from '../ContactSupport';
import SeoPage from '../components/SeoPage';
import Icon from '../Icon';
import './contact-premium.css';

export const metadata: Metadata = {
  title: 'Contact Amanah Giving | Help & Support',
  description: 'Find practical guidance on campaigns, payment questions, privacy and accessibility. Prepare a local feedback draft without sharing private information.',
  alternates: { canonical: '/contact' },
};

export default function Contact() {
  return (
    <SeoPage
      eyebrow="We’re here to help"
      title="Questions about giving? Start here."
      intro="Find clear guidance about campaigns, payments, privacy and accessibility. When preparing a question, include public campaign details only—never private payment or identity information."
      headerAside={
        <aside className="contact-help-aside" aria-label="Support options">
          <div className="contact-aside-top">
            <span className="contact-aside-icon"><Icon name="support" /></span>
            <span className="contact-aside-status"><Icon name="shield" /> Draft-only support</span>
          </div>
          <h2>Find your next step.</h2>
          <p>Explore the answers or prepare a message to keep on your device. Direct support messaging is not connected.</p>
          <div className="contact-aside-actions">
            <a href="#contact-feedback" className="contact-aside-primary">Prepare a draft <Icon name="arrow-right" /></a>
            <a href="/faq" className="contact-aside-secondary">Browse FAQs <Icon name="arrow-right" /></a>
          </div>
        </aside>
      }
      sections={[
        {
          heading: 'Campaign questions',
          body: 'Use the public campaign name and location to frame questions about the stated need, budget, organization or published progress.',
        },
        {
          heading: 'Payment & receipt questions',
          body: 'If a payment is pending, do not make another gift. Check the provider’s official channel; never put transaction IDs, M-PESA references or card details in a draft.',
        },
        {
          heading: 'Privacy & accessibility',
          body: 'Learn how drafts and private evidence are handled, or ask about language and accessibility. English is available; Kiswahili and Arabic are planned.',
          links: [{ href: '/policies', label: 'Privacy policy' }],
        },
      ]}
    >
      <ContactSupport />
    </SeoPage>
  );
}
