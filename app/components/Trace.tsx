"use client";
import { useEffect, useState } from "react";
import { Language, formatMoney } from "@/lib/domain";
export default function Trace({
  campaign,
  language,
}: {
  campaign: string;
  language: Language;
}) {
  const [releases, setReleases] = useState<
    | {
        id: string;
        amount: number;
        giving_type: string;
        purpose: string;
        created_at: string;
      }[]
    | null
  >(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/trace?campaign=${campaign}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ releases: NonNullable<typeof releases> }>;
      })
      .then((d) => setReleases(d.releases))
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [campaign]);
  const t = (en: string, sw: string) => (language === "sw" ? sw : en);
  return (
    <section>
      <h3>
        {t("Approved disbursement record", "Rekodi ya fedha zilizoidhinishwa")}
      </h3>
      {error ? (
        <p role="alert">
          {t(
            "The release record is temporarily unavailable.",
            "Rekodi ya fedha haipatikani kwa sasa.",
          )}
        </p>
      ) : releases === null ? (
        <p role="status">{t("Loading…", "Inapakia…")}</p>
      ) : !releases.length ? (
        <p>
          {t(
            "No completed releases recorded yet.",
            "Hakuna fedha zilizotolewa zilizorekodiwa bado.",
          )}
        </p>
      ) : (
        releases.map((r) => (
          <article className="mvp-light-card" key={r.id}>
            <strong>
              {formatMoney(r.amount, language)} · {r.giving_type}
            </strong>
            <p>{r.purpose}</p>
            <time>{new Date(r.created_at).toLocaleDateString()}</time>
          </article>
        ))
      )}
    </section>
  );
}
