import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '../Icon';
import SeoPage from '../components/SeoPage';
import HajjDemo from './HajjDemo';

export const metadata: Metadata = {
  title: 'Amanah Hajj | Pilgrim Sponsorship Demo',
  description: 'Try Amanah Giving’s Kenya-first Hajj sponsorship demo, from community and family support to pilgrimage preparation and impact reporting.',
  alternates: { canonical: '/hajj' },
};

export default function HajjPage() {
  return (
    <SeoPage eyebrow="Amanah Hajj" title="A journey of faith, made possible together." intro="Explore how community Sadaqah and private family sponsorship could help eligible pilgrims in Kenya prepare for Hajj.">
      <div className="hajj-programme">
        <HajjDemo/>
        <section className="hajj-safeguards" aria-labelledby="hajj-safeguards-title">
          <h2 id="hajj-safeguards-title">How sponsorship would be safeguarded</h2>
          <ul>
            <li><Icon name="wallet"/><div><strong>Sadaqah funding</strong><p>Each sponsorship would have a separate funding record, with documented approvals and expense reconciliation. The pilot would keep these gifts separate from Zakat.</p></div></li>
            <li><Icon name="evidence"/><div><strong>Authorised channels</strong><p>Live funding targets would use verified provider quotations. The programme would set rules for cancellations and unused funds before accepting gifts.</p></div></li>
            <li><Icon name="shield"/><div><strong>Privacy and dignity</strong><p>Reviewers would assess financial need and travel readiness privately. Public stories or photos would require informed consent.</p></div></li>
          </ul>
          <Link className="text-link" href="/#impact">See how Amanah tracks impact <Icon name="arrow-right"/></Link>
        </section>
      </div>
    </SeoPage>
  );
}
