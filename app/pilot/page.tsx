import type { Metadata } from 'next';
import SeoPage from '../components/SeoPage';
import PilotWorkspace from './PilotWorkspace';
import './pilot.css';

export const metadata: Metadata = {
  title: 'Connected Giving Pilot | Amanah Giving',
  description: 'Explore sample M-PESA giving, fund reconciliation and evidence reporting in a Kenya-first pilot.',
  robots: { index: false, follow: true },
};

export default async function PilotPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign } = await searchParams;
  return (
    <SeoPage eyebrow="Amanah Giving · Kenya pilot" title="Follow a gift from intention to impact."
      intro="Try a connected giving journey with sample campaigns, M-PESA payment outcomes, restricted funds and verified delivery evidence.">
      <PilotWorkspace initialCampaign={campaign}/>
    </SeoPage>
  );
}
