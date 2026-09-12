import { verifyStripeSignature } from "@/lib/payment-validation";
import { serviceDatabase } from "@/lib/supabase/server";
import { boundedBody } from '@/lib/body';
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 256000)
    return new Response("Too large", { status: 413 });
  let raw:string;
  try { raw=new TextDecoder().decode(await boundedBody(request,256000)); } catch {return new Response('Invalid body',{status:413});}
  if (
    raw.length > 256000 ||
    !verifyStripeSignature(
      raw,
      request.headers.get("stripe-signature") || "",
      secret,
    )
  )
    return new Response("Invalid signature", { status: 400 });
  try {
    const event = JSON.parse(raw);
    if (["charge.refunded", "charge.dispute.created"].includes(event.type)) {
      const reference = event.data.object.payment_intent;
      if (typeof reference !== "string")
        return new Response("Payment reference missing", { status: 400 });
      const { error } = await serviceDatabase().rpc("flag_provider_event", {
        p_reference: reference,
        p_event: event.id,
      });
      return error
        ? new Response("Reversal review pending", { status: 500 })
        : Response.json({ received: true });
    }
    if (
      ![
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    )
      return Response.json({ received: true });
    const session = event.data.object;
    if (session.payment_status !== "paid")
      return Response.json({ received: true });
    if (
      session.currency !== "kes" ||
      session.mode !== "payment" ||
      !session.client_reference_id ||
      !session.payment_intent
    )
      return new Response("Payment mismatch", { status: 400 });
    const { error } = await serviceDatabase().rpc("confirm_payment", {
      p_donation: session.client_reference_id,
      p_provider_id: session.id,
      p_reference: session.payment_intent,
      p_event: event.id,
      p_amount: session.amount_total,
      p_provider: "stripe",
    });
    if (error) return new Response("Confirmation pending", { status: 500 });
    return Response.json({ received: true });
  } catch {
    return new Response("Webhook processing failed", { status: 500 });
  }
}
