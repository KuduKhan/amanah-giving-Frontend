import "server-only";
import { ApiError } from "./api";
import { serviceDatabase } from "./supabase/server";
import { privatePhone } from "./payment-validation";

function env(name: string) {
  const value = process.env[name];
  if (!value)
    throw new ApiError("This payment method is not yet available", 503);
  return value;
}
export function paymentReady(provider: string) {
  if (process.env.PAYMENTS_ENABLED !== "true")
    throw new ApiError(
      "Donations will open after payment setup is complete",
      503,
    );
  const url = new URL(env("APP_URL"));
  if (url.protocol !== "https:")
    throw new ApiError("Payments require the secure live or sandbox URL", 503);
  env("SUPABASE_SERVICE_ROLE_KEY");
  for (const key of provider === "stripe"
    ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
    : [
        "MPESA_CONSUMER_KEY",
        "MPESA_CONSUMER_SECRET",
        "MPESA_SHORTCODE",
        "MPESA_PASSKEY",
        "MPESA_CALLBACK_SECRET",
      ])
    env(key);
}
async function providerJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(18000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Provider request failed");
  return response.json() as Promise<{
    access_token?: string;
    id?: string;
    url?: string;
    ResponseCode?: string;
    CheckoutRequestID?: string;
    ResultCode?: number;
  }>;
}
const mpesaBase = () =>
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
async function mpesa(path: string, body: object) {
  const token = await providerJson(
    `${mpesaBase()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env("MPESA_CONSUMER_KEY")}:${env("MPESA_CONSUMER_SECRET")}`).toString("base64")}`,
      },
    },
  );
  return providerJson(`${mpesaBase()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
function mpesaCredentials() {
  const timestamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/\D/g, "");
  return {
    BusinessShortCode: env("MPESA_SHORTCODE"),
    Password: Buffer.from(
      `${env("MPESA_SHORTCODE")}${env("MPESA_PASSKEY")}${timestamp}`,
    ).toString("base64"),
    Timestamp: timestamp,
  };
}
export async function startPayment(
  donation: {
    id: string;
    amount: number;
    campaign_id: string;
    provider: string;
  },
  phone?: string,
) {
  if (donation.provider === "stripe") {
    const form = new URLSearchParams({
      mode: "payment",
      success_url: `${env("APP_URL")}/?payment=${donation.id}`,
      cancel_url: `${env("APP_URL")}/?payment=${donation.id}&cancelled=1`,
      client_reference_id: donation.id,
      "line_items[0][price_data][currency]": "kes",
      "line_items[0][price_data][unit_amount]": String(donation.amount),
      "line_items[0][price_data][product_data][name]": "Amanah Giving donation",
      "line_items[0][quantity]": "1",
      "metadata[donation_id]": donation.id,
    });
    const session = await providerJson(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
          "Idempotency-Key": donation.id,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );
    if (
      !session.id ||
      !session.url ||
      new URL(session.url).hostname !== "checkout.stripe.com"
    )
      throw new Error("Invalid hosted checkout");
    return { providerId: session.id as string, url: session.url as string };
  }
  const result = await mpesa("/mpesa/stkpush/v1/processrequest", {
    ...mpesaCredentials(),
    TransactionType: "CustomerPayBillOnline",
    Amount: donation.amount / 100,
    PartyA: phone,
    PartyB: env("MPESA_SHORTCODE"),
    PhoneNumber: phone,
    CallBackURL: `${env("APP_URL")}/api/webhooks/mpesa?token=${encodeURIComponent(env("MPESA_CALLBACK_SECRET"))}`,
    AccountReference: donation.id.replaceAll("-", "").slice(0, 12),
    TransactionDesc: "Amanah donation",
  });
  if (String(result.ResponseCode) !== "0" || !result.CheckoutRequestID)
    throw new Error("M-PESA initiation rejected");
  return { providerId: result.CheckoutRequestID as string };
}
export async function reconcileMpesa(checkoutId: string) {
  const db = serviceDatabase();
  const { data: donation, error } = await db
    .from("donations")
    .select("*")
    .eq("provider_id", checkoutId)
    .eq("provider", "mpesa")
    .maybeSingle();
  if (error) throw error;
  if (!donation || donation.status === "confirmed") return;
  const { data: callback, error: callbackError } = await db
    .from("provider_callbacks")
    .select("*")
    .eq("checkout_id", checkoutId)
    .maybeSingle();
  if (callbackError) throw callbackError;
  if (!callback) return;
  const result = await mpesa("/mpesa/stkpushquery/v1/query", {
    ...mpesaCredentials(),
    CheckoutRequestID: checkoutId,
  });
  if (
    !callback.success &&
    [1, 1032, 1037].includes(Number(result.ResultCode)) &&
    Number(result.ResultCode) === callback.result_code
  ) {
    const failed = await db.rpc("fail_payment", {
      p_donation: donation.id,
      p_provider_id: checkoutId,
    });
    if (failed.error) throw failed.error;
    return;
  }
  if (String(result.ResultCode) !== "0" || !callback.success) return;
  if (
    Number(callback.amount) !== Number(donation.amount) ||
    callback.phone_hash !== donation.phone_hash ||
    !callback.reference
  )
    throw new Error("Callback mismatch");
  const confirmation = await db.rpc("confirm_payment", {
    p_donation: donation.id,
    p_provider_id: checkoutId,
    p_reference: callback.reference,
    p_event: `mpesa:${checkoutId}`,
    p_amount: donation.amount,
    p_provider: "mpesa",
  });
  if (confirmation.error) throw confirmation.error;
}
export const phoneHash = (phone: string) =>
  privatePhone(phone, env("MPESA_CALLBACK_SECRET"));

export async function reconcilePending() {
  const db = serviceDatabase();
  const { data: pending, error } = await db
    .from("donations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  let checked = 0;
  let unresolved = 0;
  // Bounded concurrency keeps a provider outage within the Vercel request budget.
  for (let i = 0; i < pending.length; i += 5)
    await Promise.all(
      pending.slice(i, i + 5).map(async (d) => {
        try {
          if (
            d.provider === "mpesa" &&
            d.provider_id &&
            !d.provider_id.startsWith("initiating:")
          )
            await reconcileMpesa(d.provider_id);
          else if (d.provider === "stripe" && d.provider_id) {
            let providerId = d.provider_id;
            if (providerId.startsWith("initiating:")) {
              if (
                Date.now() - new Date(d.created_at).getTime() >
                23 * 60 * 60 * 1000
              ) {
                unresolved++;
                return;
              }
              const started = await startPayment(d);
              providerId = started.providerId;
              const save = await db
                .from("donations")
                .update({ provider_id: providerId, checkout_url: started.url })
                .eq("id", d.id);
              if (save.error) throw save.error;
            }
            const r = await fetch(
              `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(providerId)}`,
              {
                headers: {
                  Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
                },
                signal: AbortSignal.timeout(15000),
                cache: "no-store",
              },
            );
            if (!r.ok) throw new Error("Provider unavailable");
            const s = (await r.json()) as {
              id: string;
              payment_status: string;
              status: string;
              currency: string;
              amount_total: number;
              client_reference_id: string;
              payment_intent: string;
            };
            if (
              s.id !== providerId ||
              s.client_reference_id !== d.id ||
              s.currency !== "kes" ||
              s.amount_total !== Number(d.amount)
            )
              throw new Error("Mismatch");
            if (s.payment_status === "paid") {
              const result = await db.rpc("confirm_payment", {
                p_donation: d.id,
                p_provider_id: s.id,
                p_reference: s.payment_intent,
                p_event: `reconcile:${s.id}`,
                p_amount: s.amount_total,
                p_provider: "stripe",
              });
              if (result.error) throw result.error;
            } else if (s.status === "expired") {
              const result = await db.rpc("fail_payment", {
                p_donation: d.id,
                p_provider_id: s.id,
              });
              if (result.error) throw result.error;
            }
          } else unresolved++;
          checked++;
        } catch {
          unresolved++;
        }
      }),
    );
  return { checked, unresolved };
}
