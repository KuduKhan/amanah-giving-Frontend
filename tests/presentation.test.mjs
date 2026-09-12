import test from "node:test";
import assert from "node:assert/strict";
import { campaignAvailability, statusLabel } from "../lib/presentation.ts";

test("campaign UI closes expired, suspended and fully funded campaigns", () => {
  const c = { goal: 100000, raised: 50000, end_date: "2026-09-13", status: "published" };
  assert.equal(campaignAvailability(c, Date.parse("2026-09-13T10:00:00Z")), "open");
  assert.equal(campaignAvailability(c, Date.parse("2026-09-14T00:00:00Z")), "closed");
  assert.equal(campaignAvailability({ ...c, status: "suspended" }, 0), "closed");
  assert.equal(campaignAvailability({ ...c, raised: 100000 }, 0), "funded");
});
test("terminal payment states never present as pending or confirmed", () => {
  for (const lang of ["en", "sw"]) {
    for (const status of ["failed", "cancelled", "refunded", "unknown"]) {
      assert.notEqual(statusLabel(status, lang), statusLabel("pending", lang));
      assert.notEqual(statusLabel(status, lang), statusLabel("confirmed", lang));
    }
  }
});
