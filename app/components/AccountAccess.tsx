"use client";
import { useState } from "react";
import { browserDatabase } from "@/lib/supabase/browser";
import type { Language } from "@/lib/domain";

export default function AccountAccess({
  language,
  onReady,
  mfaOnly = false,
}: {
  language: Language;
  onReady: () => void;
  mfaOnly?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [factor, setFactor] = useState("");
  const [secret, setSecret] = useState("");
  const [factorNeeded, setFactorNeeded] = useState(mfaOnly);
  const t = (en: string, sw: string) => (language === "sw" ? sw : en);
  async function prepareMfa() {
    const db = browserDatabase();
    const factors = await db.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const existing = factors.data.totp.find((f) => f.status === "verified");
    if (existing) {
      setFactor(existing.id);
      return;
    }
    // An abandoned enrollment is removed before creating a replacement.
    for (const pending of factors.data.all.filter(
      (f) => f.status !== "verified",
    ))
      await db.auth.mfa.unenroll({ factorId: pending.id });
    const result = await db.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Amanah Giving",
    });
    if (result.error) throw result.error;
    setFactor(result.data.id);
    setSecret(result.data.totp.secret);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const db = browserDatabase();
      if (factorNeeded) {
        if (!factor) {
          await prepareMfa();
          return;
        }
        const result = await db.auth.mfa.challengeAndVerify({
          factorId: factor,
          code,
        });
        if (result.error) throw result.error;
        onReady();
      } else if (!sent) {
        const result = await db.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (result.error) throw result.error;
        setSent(true);
      } else {
        const result = await db.auth.verifyOtp({
          email,
          token: code,
          type: "email",
        });
        if (result.error) throw result.error;
        const assurance = await db.auth.mfa.getAuthenticatorAssuranceLevel();
        if (
          assurance.data?.nextLevel === "aal2" &&
          assurance.data.currentLevel !== "aal2"
        ) {
          setFactorNeeded(true);
          setCode("");
          await prepareMfa();
        } else onReady();
      }
    } catch {
      setError(
        t(
          "Unable to verify. Check your code, or request a fresh code after a minute.",
          "Imeshindikana kuthibitisha. Kagua msimbo au omba mpya baada ya dakika moja.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="mvp-form" onSubmit={submit}>
      <h2>
        {factorNeeded
          ? t("Protect your account", "Linda akaunti yako")
          : t("Your giving starts here", "Sadaka yako inaanzia hapa")}
      </h2>
      <p>
        {factorNeeded
          ? t(
              "Enter the six-digit code from your authenticator. Staff access requires two-factor verification.",
              "Ingiza msimbo wa tarakimu sita kutoka kwenye programu yako ya uthibitishaji. Wafanyakazi wanahitaji uthibitishaji wa hatua mbili.",
            )
          : t(
              "Sign in or create an account with a secure email code. No password to remember.",
              "Ingia au fungua akaunti kwa msimbo salama wa barua pepe.",
            )}
      </p>
      {!factorNeeded && !sent && (
        <label>
          {t("Email address", "Barua pepe")}
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      {secret && (
        <div className="mvp-notice">
          <p>
            {t(
              "Add an account in your authenticator using this setup key, then enter its code.",
              "Ongeza akaunti katika programu yako ya uthibitishaji kwa ufunguo huu, kisha ingiza msimbo wake.",
            )}
          </p>
          <code className="mvp-reference">{secret}</code>
        </div>
      )}
      {(sent || (factorNeeded && factor)) && (
        <label>
          {t("Verification code", "Msimbo wa uthibitishaji")}
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </label>
      )}
      {sent && !factorNeeded && (
        <p>
          {t(
            "Check your inbox and spam folder. Use the latest code.",
            "Angalia kisanduku chako cha barua na folda ya taka. Tumia msimbo wa hivi karibuni.",
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="mvp-error">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy
          ? t("Please wait…", "Subiri…")
          : sent || (factorNeeded && factor)
            ? t("Verify and continue", "Thibitisha na uendelee")
            : t("Email me a code", "Nitumie msimbo")}
      </button>
      {sent && !factorNeeded && (
        <button
          type="button"
          className="text-link"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode("");
          }}
        >
          {t(
            "Use another email or resend",
            "Tumia barua nyingine au tuma tena",
          )}
        </button>
      )}
    </form>
  );
}
