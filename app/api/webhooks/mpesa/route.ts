import { sameSecret } from "@/lib/payment-validation";
import { phoneHash, reconcileMpesa } from "@/lib/payments";
import { serviceDatabase } from "@/lib/supabase/server";
import { jsonBody } from "@/lib/api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.MPESA_CALLBACK_SECRET || "";
  if (!sameSecret(new URL(request.url).searchParams.get("token") || "", secret))
    return new Response("Unauthorized", { status: 401 });
  try {
    const payload = await jsonBody(request);
    const body = payload.Body as {
      stkCallback?: {
        CheckoutRequestID: string;
        ResultCode: number;
        CallbackMetadata?: { Item: { Name: string; Value: string | number }[] };
      };
    };
    const callback = body?.stkCallback;
    if (!callback?.CheckoutRequestID || callback.CheckoutRequestID.length > 180)
      return new Response("Invalid callback", { status: 400 });
    const items = Object.fromEntries(
      (callback.CallbackMetadata?.Item || []).map((i) => [i.Name, i.Value]),
    );
    const amount = Number(items.Amount) * 100;
    const success = Number(callback.ResultCode) === 0;
    if (
      success &&
      (!Number.isSafeInteger(amount) ||
        amount < 1 ||
        !/^254[17]\d{8}$/.test(String(items.PhoneNumber)) ||
        !/^[A-Z0-9]{8,20}$/.test(String(items.MpesaReceiptNumber)))
    )
      return new Response("Invalid metadata", { status: 400 });
    // Durable inbox survives early callbacks and transient query outages. Do not store the donor phone.
    const { error } = await serviceDatabase()
      .from("provider_callbacks")
      .upsert(
        {
          checkout_id: callback.CheckoutRequestID,
          success,
          result_code: Number(callback.ResultCode),
          amount: success ? amount : 0,
          phone_hash: success ? phoneHash(String(items.PhoneNumber)) : "",
          reference: success ? String(items.MpesaReceiptNumber) : "",
        },
        { onConflict: "checkout_id", ignoreDuplicates: true },
      );
    if (error) throw error;
    await reconcileMpesa(callback.CheckoutRequestID);
    return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch {
    return new Response("Callback pending retry", { status: 500 });
  }
}
