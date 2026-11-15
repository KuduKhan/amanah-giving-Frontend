import type { Metadata } from 'next';
import SeoPage from '../components/SeoPage';
import Icon from '../Icon';
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
      intro="Try a connected giving journey with sample campaigns, M-PESA payment outcomes, restricted funds and verified delivery evidence."
      headerAside={
        <aside className="pilot-demo-card" aria-label="Sample environment">
          <span className="pilot-demo-mark"><Icon name="shield"/></span>
          <div>
            <p className="pilot-demo-label">INTERACTIVE DEMO</p>
            <h2>Explore every step safely.</h2>
            <p>Use fictional details. Demo activity stays on this device and never triggers a real payment.</p>
          </div>
        </aside>
      }>
      <PilotWorkspace initialCampaign={campaign}/>
    </SeoPage>
  );
}
