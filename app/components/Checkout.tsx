"use client";
import { useEffect, useRef, useState } from "react";
import { Campaign, Language, formatMoney } from "@/lib/domain";
import AccountAccess from "./AccountAccess";
import Icon from "../Icon";
import Link from "next/link";
import { campaignAvailability, statusLabel } from "@/lib/presentation";
export default function Checkout({
  campaign,
  language,
  methods,
}: {
  campaign: Campaign;
  language: Language;
  methods: { mpesa: boolean; stripe: boolean };
}) {
  const [auth, setAuth] = useState<"loading" | "signin" | "mfa" | "ready">(
    "loading",
  );
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState("SADAQAH");
  const [amount, setAmount] = useState("1000");
  const [anonymous, setAnonymous] = useState(true);
  const [dedication, setDedication] = useState("");
  const [provider, setProvider] = useState(methods.mpesa ? "mpesa" : "stripe");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<{
    id: string;
    status: string;
    message?: string;
  } | null>(null);
  const key = useRef("");
  const t = (en: string, sw: string) => (language === "sw" ? sw : en);
  async function checkAuth() {
    try {
      const r = await fetch("/api/workspace", { cache: "no-store" });
      const d = (await r.json()) as {
        id: string;
        status: string;
        message?: string;
        url?: string;
        error?: string;
        mfaRequired?: boolean;
      };
      setAuth(r.ok ? (d.mfaRequired ? "mfa" : "ready") : "signin");
    } catch {
      setError(
        t(
          "Connection unavailable. Try again.",
          "Mtandao haupatikani. Jaribu tena.",
        ),
      );
      setAuth("signin");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const d = (await r.json()) as { mfaRequired?: boolean };
        setAuth(r.ok ? (d.mfaRequired ? "mfa" : "ready") : "signin");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setAuth("signin");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    let cancelled = false;
    let count = 0;
    const timer = setInterval(async () => {
      if (++count > 36) {
        clearInterval(timer);
        return;
      }
      try {
        const r = await fetch(`/api/payments?id=${payment.id}`, {
          cache: "no-store",
        });
        const d = (await r.json()) as {
          id: string;
          status: string;
          message?: string;
          url?: string;
          error?: string;
          mfaRequired?: boolean;
        };
        if (r.ok && !cancelled && d.status !== "pending") setPayment(d);
      } catch {
        /* Pending remains pending on a network error. */
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [payment]);
  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (busy || step !== 3 || campaignAvailability(campaign) !== "open" ||
        !Number.isInteger(Number(amount)) || Number(amount) < 100 || Number(amount) > 1000000 ||
        !(provider === "mpesa" ? methods.mpesa : methods.stripe)) return;
    setBusy(true);
    setError("");
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const r = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          amount: Number(amount) * 100,
          giving_type: kind,
          anonymous,
          dedication,
          provider,
          phone,
          key: key.current,
        }),
      });
      const d = (await r.json()) as {
        id: string;
        status: string;
        message?: string;
        url?: string;
        error?: string;
        mfaRequired?: boolean;
      };
      if (!r.ok) throw new Error(d.error);
      setPayment(d);
      if (d.url) window.location.assign(d.url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("Payment could not start.", "Malipo hayakuanza."),
      );
    } finally {
      setBusy(false);
    }
  }
  if (auth === "loading")
    return (
      <p role="status">
        {t("Preparing your secure checkout…", "Tunaandaa malipo yako salama…")}
      </p>
    );
  if (auth === "signin" || auth === "mfa")
    return (
      <AccountAccess
        language={language}
        onReady={checkAuth}
        mfaOnly={auth === "mfa"}
      />
    );
  if (payment)
    return (
      <div className="mvp-form">
        <Icon name={payment.status === "confirmed" ? "shield" : "clock"} />
        <h2>
          {payment.status === "confirmed"
            ? t("JazakAllahu Khayran", "JazakAllahu Khayran")
            : payment.status !== "pending" ? statusLabel(payment.status, language) : t(
                "Awaiting payment confirmation",
                "Tunasubiri uthibitisho wa malipo",
              )}
        </h2>
        <p>
          {payment.status === "confirmed"
            ? t(
                "Your donation is confirmed and your receipt is ready.",
                "Mchango wako umethibitishwa na risiti iko tayari.",
              )
            : payment.status !== "pending"
              ? t("This payment is not a confirmed gift. Check My Giving before starting another payment.", "Malipo haya si mchango uliothibitishwa. Angalia Sadaka zangu kabla ya kuanza malipo mengine.")
              : payment.message ||
              t(
                "Complete the prompt on your phone. We will confirm your gift only after the payment provider verifies it. You can safely close this window.",
                "Kamilisha ombi kwenye simu yako. Mchango utathibitishwa baada ya mtoa huduma kuthibitisha malipo. Unaweza kufunga dirisha hili.",
              )}
        </p>
        {payment.status === "confirmed" && <a className="text-link" href={`/api/receipts/${payment.id}`} target="_blank" rel="noopener">{t("View / print receipt", "Ona / chapisha risiti")} <Icon name="download" /></a>}
        <a className="button" href="/workspace">
          {t("Open My Giving", "Fungua Sadaka zangu")} <Icon name="→" />
        </a>
      </div>
    );
  if (campaignAvailability(campaign) !== "open") return <div className="mvp-form"><h2>{t("This campaign is closed to new gifts", "Mradi huu umefungwa kwa michango mipya")}</h2><p>{t("Explore another reviewed cause to continue giving.", "Angalia mradi mwingine uliokaguliwa ili kuendelea kutoa.")}</p><Link className="button" href="/#causes">{t("Explore causes", "Angalia miradi")}</Link></div>;
  return (
    <form className="mvp-form" onSubmit={pay}>
      <p className="eyebrow">
        {t("Your intention, protected", "Nia yako inalindwa")}
      </p>
      <h2>{language === "sw" ? campaign.title_sw : campaign.title}</h2>
      <p>
        {t("Step", "Hatua")} {step} / 3
      </p>
      {step === 1 && (
        <>
          <h3>{t("Choose your giving type", "Chagua aina ya mchango")}</h3>
          <div className="option-grid">
            <button
              type="button"
              className={kind === "SADAQAH" ? "selected" : ""}
              onClick={() => setKind("SADAQAH")}
            >
              Sadaqah
            </button>
            <button
              type="button"
              disabled={!campaign.zakat_eligible}
              className={kind === "ZAKAT" ? "selected" : ""}
              onClick={() => setKind("ZAKAT")}
            >
              {t("Zakat", "Zaka")}
            </button>
          </div>
          <p>
            {campaign.zakat_eligible
              ? t(
                  "Zakat eligibility has an independent review and a recorded policy version.",
                  "Ustahiki wa Zaka umekaguliwa kwa sera iliyorekodiwa.",
                )
              : t(
                  "This campaign accepts Sadaqah. Zakat is available only for eligible campaigns.",
                  "Mradi huu unapokea Sadaqah. Zaka hupokelewa kwa miradi inayostahiki pekee.",
                )}
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <div className="amount-grid">
            {[100, 500, 1000, 2500, 5000].map((n) => (
              <button
                type="button"
                className={Number(amount) === n ? "selected" : ""}
                key={n}
                onClick={() => setAmount(String(n))}
              >
                {formatMoney(n * 100, language)}
              </button>
            ))}
          </div>
          <label>
            {t("Amount in Kenyan shillings", "Kiasi kwa shilingi za Kenya")}
            <div className="mvp-currency">
              <span>KSh</span>
              <input
                required
                type="number"
                min={100}
                max={1000000}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </label>
          <label className="mvp-check">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            {t("Keep my name private publicly", "Ficha jina langu kwa umma")}
          </label>
          <label>
            {t("Private dedication (optional)", "Ujumbe binafsi (si lazima)")}
            <input
              maxLength={160}
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
            />
          </label>
          <p>
            {t(
              "Your payment details and donation amount are always private.",
              "Taarifa za malipo na kiasi cha mchango wako ni za faragha.",
            )}
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <div className="payment-tabs">
            <button
              type="button"
              disabled={!methods.mpesa}
              className={provider === "mpesa" ? "active" : ""}
              onClick={() => setProvider("mpesa")}
            >
              M-PESA
            </button>
            <button
              type="button"
              disabled={!methods.stripe}
              className={provider === "stripe" ? "active" : ""}
              onClick={() => setProvider("stripe")}
            >
              {t("Card", "Kadi")}
            </button>
          </div>
          {provider === "mpesa" ? (
            <label>
              {t("M-PESA phone number", "Nambari ya M-PESA")}
              <input
                required
                type="tel"
                autoComplete="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          ) : (
            <p>
              {t(
                "You will enter your card details on the payment provider’s secure checkout.",
                "Utaingiza taarifa za kadi kwenye ukurasa salama wa mtoa huduma.",
              )}
            </p>
          )}
          <div className="payment-summary">
            <span>{kind === "ZAKAT" ? "Zakat" : "Sadaqah"}</span>
            <b>{formatMoney(Number(amount) * 100, language)}</b>
            <small>
              {t(
                "No platform fee or tip added. Processing fees are paid from operating funds; your full gift remains allocated to the campaign.",
                "Hakuna ada ya jukwaa au bakshishi. Ada za malipo hulipwa na mfuko wa uendeshaji; mchango wote hutengwa kwa mradi.",
              )}
            </small>
          </div>
          {!methods.mpesa && !methods.stripe && (
            <p role="status">
              {t(
                "Payments are not open yet. Please return soon.",
                "Malipo hayajafunguliwa bado. Tafadhali rudi hivi karibuni.",
              )}
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mvp-error">
          {error}
        </p>
      )}
      <div className="mvp-actions">
        {step > 1 && (
          <button
            type="button"
            className="outline-button"
            disabled={busy}
            onClick={() => setStep(step - 1)}
          >
            {t("Back", "Rudi")}
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            className="button"
            disabled={
              step === 2 &&
              (!Number.isInteger(Number(amount)) ||
                Number(amount) < 100 ||
                Number(amount) > 1000000)
            }
            onClick={() => setStep(step + 1)}
          >
            {t("Continue", "Endelea")} <Icon name="→" />
          </button>
        ) : (
          <button
            className="button"
            disabled={busy || (!methods.mpesa && !methods.stripe)}
          >
            {busy
              ? t("Connecting…", "Inaunganisha…")
              : provider === "mpesa"
                ? t("Send M-PESA prompt", "Tuma ombi la M-PESA")
                : t("Continue to secure checkout", "Endelea kwa malipo salama")}
          </button>
        )}
      </div>
    </form>
  );
}
