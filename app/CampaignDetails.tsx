import Image from 'next/image';
import Icon from './Icon';
import { downloadText } from './givingDrafts';
import { campaignImageFocus } from './campaignImageFocus';

const budget = [['Project delivery', 82], ['Verification & reporting', 8], ['Payment and operations', 10]] as const;
const stages = [
  ['Mobilization', '20% · reconciled'],
  ['Core delivery', '45% · evidence required'],
  ['Completion', '25% · pending'],
  ['Retention', '10% · after impact review'],
] as const;

type Props = {
  campaign: { id: string; title: string; image: string; story: string; donors: number; days: number; zakat: boolean };
  raised: string;
  evidenceOpen: boolean;
  onToggleEvidence: () => void;
  onClose: () => void;
  onAction: () => void;
};

export default function CampaignDetails({ campaign, raised, evidenceOpen, onToggleEvidence, onClose, onAction }: Props) {
  const completed = campaign.days === 0;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="campaign-detail-title">
      <div className="detail-panel campaign-detail">
        <div className="campaign-detail-bar">
          <span>Campaign details</span>
          <button className="close" type="button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button>
        </div>
        <div className="detail-media">
          <Image className="detail-hero" src={campaign.image} alt="" fill sizes="(max-width: 780px) 100vw, 450px" style={{ objectFit: "cover", objectPosition: campaignImageFocus(campaign.image) }}/>
          <div className="detail-media-caption">
            <span><Icon name="shield"/>Level 3 verified</span>
            <b>Field need and budget reviewed</b>
          </div>
        </div>
        <div className="detail-content">
          <p className="verified"><Icon name="shield"/>Example campaign · {campaign.id}</p>
          <h2 id="campaign-detail-title">{campaign.title}</h2>
          <p className="campaign-detail-story">{campaign.story}</p>
          <dl className="detail-facts">
            <div><dt>Raised</dt><dd>{raised}</dd></div>
            <div><dt>Donors</dt><dd>{campaign.donors.toLocaleString('en-KE')}</dd></div>
            <div><dt>{completed ? 'Project status' : 'Days left'}</dt><dd>{completed ? 'Complete' : campaign.days}</dd></div>
          </dl>

          <section className="campaign-detail-card campaign-evidence" aria-labelledby="campaign-evidence-toggle">
            <h3><button id="campaign-evidence-toggle" type="button" aria-expanded={evidenceOpen} aria-controls="campaign-evidence-body" onClick={onToggleEvidence}><Icon name="evidence"/><span>Verification summary</span><Icon name="chevron"/></button></h3>
            <div className="campaign-evidence-body" id="campaign-evidence-body" hidden={!evidenceOpen}>
              <p>Review covers the organization, project scope, budget and payment destination.</p>
              <dl><div><dt>Reference</dt><dd>{campaign.id}</dd></div><div><dt>Status</dt><dd>{completed ? 'Completed delivery example' : 'Active appeal example'}</dd></div></dl>
              <button className="text-link" type="button" onClick={() => downloadText(`${campaign.id}-summary.txt`, `${campaign.title}\n${campaign.id}\n${campaign.story}\nIllustrative verification summary.`)}><Icon name="download"/>Download example summary</button>
            </div>
            <p className="campaign-example-note">Illustrative record. Original verification documents are unavailable in this preview.</p>
          </section>

          <section className="campaign-detail-card" aria-labelledby="campaign-budget-title">
            <h3 id="campaign-budget-title">Transparent budget</h3>
            <dl className="campaign-budget">
              {budget.map(([label, share]) => <div key={label}><dt>{label}</dt><dd>{share}%</dd><progress aria-label={label} value={share} max={100}/></div>)}
            </dl>
          </section>

          <section className="campaign-detail-card" aria-labelledby="campaign-disbursement-title">
            <p className="eyebrow">Disbursement plan</p>
            <h3 id="campaign-disbursement-title">{completed ? 'Completed delivery record' : 'Released only against milestones'}</h3>
            {completed ? <p className="campaign-complete"><Icon name="check"/><span>All delivery milestones, checks and reconciliation are complete in this example.</span></p> : (
              <ol className="campaign-release-steps" role="list">
                {stages.map(([title, status], index) => <li key={title} aria-current={index === 1 ? 'step' : undefined}><span className="campaign-stage-icon" aria-hidden="true">{index === 0 ? <Icon name="check"/> : index + 1}</span><div><strong>{title}</strong><small>{status}</small></div></li>)}
              </ol>
            )}
          </section>

          <section className="campaign-detail-card campaign-safeguards" aria-labelledby="campaign-safeguards-title">
            <h3 id="campaign-safeguards-title">What we verified</h3>
            <p>Responsible organization, supporting documents, field need, budget, payment destination and update schedule.</p>
            <ul role="list"><li><Icon name="giving"/>{campaign.zakat ? 'Zakat eligible' : 'Not Zakat eligible'}</li><li><Icon name="wallet"/>Restricted fund</li><li><Icon name="calendar"/>Update schedule</li><li><Icon name="support"/>Complaint channel</li></ul>
          </section>
          <button className="button full" type="button" onClick={onAction}>{completed ? 'Explore active causes' : 'Donate to this campaign'} <Icon name="arrow-right"/></button>
        </div>
      </div>
    </div>
  );
}
