import type { Metadata } from 'next';
import SeoPage from '../components/SeoPage';

export const metadata: Metadata = {
  title: 'Privacy and Giving Terms | Amanah Giving',
  description: 'Read the privacy and giving principles that guide Amanah Giving.',
  alternates: { canonical: '/policies' },
};

export default function Policies() {
  return <SeoPage eyebrow="Clear by design" title="Your giving deserves a clear record." intro="Amanah Giving explains what we collect, why we need it and how we protect the trust placed in every gift." sections={[{ heading: 'Privacy first', body: 'We collect the information needed to confirm a donation, issue a receipt and keep the giving record useful. Public campaign reporting does not expose donor payment details or beneficiary identities.' }, { heading: 'Separate giving purposes', body: 'Zakat and Sadaqah are recorded as distinct giving types. Campaign eligibility and release decisions are tied to the relevant policy and reviewed before they are published.' }, { heading: 'Need a correction?', body: 'If a receipt, profile or privacy detail needs attention, contact the team with the relevant public reference. We will explain the next step and keep sensitive information private.', links: [{ href: '/contact', label: 'Contact Amanah Giving' }, { href: '/', label: 'Return home' }] }]} />;
}
