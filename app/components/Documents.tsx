"use client";
import { useState } from "react";
import type { Language, Workspace } from "@/lib/domain";
export default function Documents({
  workspace,
  language,
  onSaved,
}: {
  workspace: Workspace;
  language: Language;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const t = (en: string, sw: string) => (language === "sw" ? sw : en);
  return (
    <section className="mvp-stack">
      <form
        className="mvp-form mvp-light-card"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            const r = await fetch("/api/documents", {
              method: "POST",
              body: data,
            });
            const result = (await r.json()) as { error?: string };
            if (!r.ok) throw new Error(result.error);
            setMessage(
              t(
                "Document securely submitted.",
                "Hati imewasilishwa kwa usalama.",
              ),
            );
            onSaved();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>
          {t(
            "Private verification evidence",
            "Ushahidi binafsi wa uthibitishaji",
          )}
        </h3>
        <p>
          {t(
            "Upload registration, authorized officer and recipient-ownership evidence. Documents are screened, encrypted and available only to you and authorized reviewers. PDF, PNG or JPEG; maximum 2 MB.",
            "Pakia ushahidi wa usajili, afisa aliyeidhinishwa na umiliki wa mpokeaji. Hati zinakaguliwa na kusimbwa; zinaonekana kwako na wakaguzi walioidhinishwa pekee. PDF, PNG au JPEG; upeo 2 MB.",
          )}
        </p>
        <label>
          {t("Organization", "Shirika")}
          <select name="organization_id" required>
            <option value="">{t("Choose…", "Chagua…")}</option>
            {workspace.organizations
              .filter((o) => o.owner_id === workspace.user.id)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t("Evidence document", "Hati ya ushahidi")}
          <input
            required
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg"
          />
        </label>
        <button className="button" disabled={busy}>
          {busy
            ? t("Screening…", "Inakagua…")
            : t("Submit evidence", "Wasilisha ushahidi")}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
      {workspace.documents.map((d) => (
        <a
          className="mvp-light-card text-link"
          href={`/api/documents?id=${d.id}`}
          key={d.id}
        >
          {t("Download private evidence", "Pakua ushahidi binafsi")} ·{" "}
          {
            workspace.organizations.find((o) => o.id === d.organization_id)
              ?.name
          }{" "}
          · {new Date(d.created_at).toLocaleDateString()}
        </a>
      ))}
    </section>
  );
}
