import Link from "next/link";
import AmanahLogo from "../AmanahLogo";
export default function Policies() {
  return (
    <main className="mvp-workspace">
      <div className="mvp-workspace-body mvp-form">
        <Link href="/">
          <AmanahLogo />
        </Link>
        <h1>
          Privacy & giving terms
          <br />
          <small>Faragha na masharti</small>
        </h1>
        <p>Version 1 · September 2026 / Toleo 1 · Septemba 2026</p>
        <h2>Your information / Taarifa zako</h2>
        <p>
          We use your verified email, profile preferences and payment references
          to maintain your account, issue receipts and investigate concerns.
          Card details are collected by the hosted payment provider. Public
          campaign pages do not expose donor payment records or beneficiary
          identities.
        </p>
        <p lang="sw">
          Tunatumia barua pepe iliyothibitishwa, mapendeleo na marejeleo ya
          malipo kusimamia akaunti, kutoa risiti na kuchunguza matatizo. Taarifa
          za kadi hukusanywa na mtoa huduma wa malipo. Rekodi za malipo na
          utambulisho wa walengwa hazichapishwi kwa umma.
        </p>
        <h2>Your intention / Nia yako</h2>
        <p>
          Choose a specific campaign and Sadaqah or Zakat. The giving type is
          fixed when the donation is created. Zakat can only fund a campaign
          with a recorded eligibility review. No platform tip or fee is added in
          this version. Operating funds cover provider charges.
        </p>
        <p lang="sw">
          Chagua mradi na Sadaqah au Zaka. Aina ya mchango hubaki
          ilivyorekodiwa. Zaka hutolewa kwa mradi wenye ukaguzi wa ustahiki.
          Hakuna ada ya jukwaa au bakshishi inayoongezwa. Mfuko wa uendeshaji
          hulipia ada za mtoa huduma.
        </p>
        <h2>Confirmation & concerns / Uthibitisho na matatizo</h2>
        <p>
          A payment is confirmed only after server verification. A pending
          payment may still complete. If charged unexpectedly, do not submit
          again; open a support request in My Giving with your payment
          reference. Refund, correction and privacy requests are reviewed by
          authorized staff. A receipt is not a statement of tax deductibility.
        </p>
        <p lang="sw">
          Malipo huthibitishwa baada ya ukaguzi wa seva. Malipo yanayosubiri
          yanaweza kukamilika. Ukitozwa bila kutarajia, usitume tena; wasiliana
          na usaidizi katika Sadaka zangu. Maombi ya kurejeshewa, kusahihisha na
          faragha hukaguliwa na wahusika walioidhinishwa. Risiti haithibitishi
          msamaha wa kodi.
        </p>
        <h2>Preferences & records / Mapendeleo na rekodi</h2>
        <p>
          Marketing consent is optional and separate from transaction records.
          Change your preferences or submit an access, correction or deletion
          request in My Giving. Financial and audit records may need to be
          retained; staff will explain any retention requirement when
          responding. Project evidence must avoid personal identities and
          private addresses.
        </p>
        <p lang="sw">
          Ridhaa ya matangazo ni ya hiari na tofauti na rekodi za malipo.
          Badilisha mapendeleo au omba ufikiaji, marekebisho au kufutwa katika
          Sadaka zangu. Rekodi za fedha na ukaguzi zinaweza kuhitaji
          kuhifadhiwa; sababu zitaelezwa. Ushahidi wa mradi usionyeshe
          utambulisho binafsi au anwani za faragha.
        </p>
        <a className="button" href="/workspace">
          My Giving & support / Sadaka zangu na usaidizi
        </a>
      </div>
    </main>
  );
}
