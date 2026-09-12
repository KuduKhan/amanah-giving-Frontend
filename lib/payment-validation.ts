import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyStripeSignature(
  raw: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const parts = signature.split(",").map((p) => p.split("="));
  const timestamp = parts.find((p) => p[0] === "t")?.[1];
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest();
  return parts
    .filter((p) => p[0] === "v1")
    .some(
      (p) =>
        /^[a-f0-9]{64}$/i.test(p[1] || "") &&
        timingSafeEqual(Buffer.from(p[1], "hex"), expected),
    );
}
export function privatePhone(phone: string, secret: string) {
  return createHmac("sha256", secret).update(phone).digest("hex");
}
export function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
