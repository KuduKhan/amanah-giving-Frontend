import {
  ApiError,
  databaseError,
  failure,
  identity,
  jsonBody,
  limit,
  requireOrigin,
  response,
} from "@/lib/api";
import { minorAmount, mpesaPhone, validUuid } from "@/lib/domain";
import {
  paymentReady,
  phoneHash,
  reconcileMpesa,
  startPayment,
} from "@/lib/payments";
import { serviceDatabase } from "@/lib/supabase/server";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { user, mfaRequired } = await identity();
    if (mfaRequired)
      throw new ApiError("Complete two-factor verification", 403);
    const body = await jsonBody(request);
    if (
      !["mpesa", "stripe"].includes(String(body.provider)) ||
      !["ZAKAT", "SADAQAH"].includes(String(body.giving_type)) ||
      !validUuid(body.campaign_id) ||
      !validUuid(body.key) ||
      typeof body.anonymous !== "boolean"
    )
      throw new ApiError("Check your donation details");
    let amount: number;
    let phone: string | undefined;
    try {
      amount = minorAmount(body.amount);
      if (body.provider === "mpesa") phone = mpesaPhone(body.phone);
    } catch (error) {
      throw new ApiError((error as Error).message);
    }
    paymentReady(String(body.provider));
    await limit(user.id, "payment", 6);
    const db = serviceDatabase();
    const { data: created, error } = await db.rpc("create_donation", {
      p_actor: user.id,
      p_campaign: body.campaign_id,
      p_amount: amount,
      p_type: body.giving_type,
      p_anonymous: body.anonymous,
      p_dedication: String(body.dedication || "").slice(0, 160),
      p_provider: body.provider,
      p_key: body.key,
    });
    if (error) databaseError(error.message);
    const donation = Array.isArray(created) ? created[0] : created;
    if (!donation || !validUuid(donation.id)) throw new Error('Invalid donation result');
    // Atomically claim initiation. A timeout must never result in a second STK push.
    const claim = await db
      .from("donations")
      .update({
        provider_id: `initiating:${donation.id}`,
        phone_hash: phone ? phoneHash(phone) : null,
      })
      .eq("id", donation.id)
      .is("provider_id", null)
      .select("id");
    if (claim.error) throw claim.error;
    if (!claim.data?.length)
      return response({
        id: donation.id,
        status: donation.status,
        url: donation.checkout_url,
        message: "Payment already started. Check its status in My Giving.",
      });
    try {
      const started = await startPayment(donation, phone);
      const saved = await db
        .from("donations")
        .update({
          provider_id: started.providerId,
          checkout_url: started.url || null,
        })
        .eq("id", donation.id);
      if (saved.error) throw saved.error;
      if (body.provider === "mpesa") await reconcileMpesa(started.providerId);
      return response({ id: donation.id, status: "pending", url: started.url });
    } catch {
      return response(
        {
          id: donation.id,
          status: "pending",
          message:
            "Confirmation is taking longer than expected. Do not retry if your phone was charged. Check My Giving or contact support.",
        },
        202,
      );
    }
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: Request) {
  try {
    const { db, user, mfaRequired } = await identity();
    if (mfaRequired)
      throw new ApiError("Complete two-factor verification", 403);
    const id = new URL(request.url).searchParams.get("id");
    if (!validUuid(id)) throw new ApiError("Invalid payment reference");
    const { data, error } = await db
      .from("donations")
      .select(
        "id,user_id,provider_id,provider,status,amount,giving_type,campaign_id,created_at,confirmed_at",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("Payment not found", 404);
    // Read-only polling; the provider webhook performs reconciliation.
    return response({
      id: data.id,
      status: data.status,
      amount: data.amount,
      giving_type: data.giving_type,
    });
  } catch (error) {
    return failure(error);
  }
}
