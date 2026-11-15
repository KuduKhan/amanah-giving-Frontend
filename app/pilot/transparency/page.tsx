import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import PilotWorkspace from '../PilotWorkspace';
import '../pilot.css';

export const metadata: Metadata = {
  title: 'Giving Transparency | Amanah Giving',
  description: 'See how Amanah reports restricted giving, releases, reversals and funds still held.',
  robots: { index: false, follow: true },
};

export default function TransparencyPage() {
  return (
    <SeoPage eyebrow="Amanah Giving · Kenya pilot" title="See where the funds went."
      intro="Explore the sample totals and reporting method. This public-facing demo shows aggregates from this browser.">
      <PilotWorkspace transparencyOnly/>
    </SeoPage>
  );
}
