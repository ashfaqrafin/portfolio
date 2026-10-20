import assert from "node:assert/strict";
import { test } from "node:test";
import { allow } from "../lib/inbox/rate-limit.ts";
import { inquirySchema, normaliseLinkedIn } from "../lib/inbox/schema.ts";

const ok = { message: "Hello there, a real message.", name: "Ana", via: "email", reply: "ana@example.com", elapsed: 9000 };

test("inquiry: a normal message passes, trimmed", () => {
  const r = inquirySchema.parse({ ...ok, message: "  Hello there, a real message.  " });
  assert.equal(r.message, "Hello there, a real message.");
  assert.deepEqual(Object.keys(r).sort(), ["elapsed", "message", "name", "reply", "via"]);
});

test("inquiry: bounds, reply checks and unknown fields are refused", () => {
  const bad = (v: object) => !inquirySchema.safeParse({ ...ok, ...v }).success;
  assert.ok(bad({ message: "too short" }));
  assert.ok(bad({ message: "x".repeat(601) }));
  assert.ok(!bad({ message: "x".repeat(600) }));
  assert.ok(bad({ reply: "not-an-email" }));
  assert.ok(bad({ via: "carrier pigeon" }));
  assert.ok(bad({ name: "n".repeat(61) }));
  assert.ok(bad({ isOwner: true }));
  assert.ok(bad({ via: "linkedin", reply: "https://evil.example/in/me" }));
});

test("inquiry: LinkedIn links are normalised to one safe form", () => {
  for (const v of ["linkedin.com/in/ana", "https://www.linkedin.com/in/ana/", "http://bd.linkedin.com/in/ana"]) {
    assert.equal(normaliseLinkedIn(v), "https://www.linkedin.com/in/ana", v);
  }
  for (const v of ["javascript:alert(1)", "https://linkedin.com.evil.dev/in/ana", "https://www.linkedin.com/feed/", "linkedin.com/in/"]) {
    assert.equal(normaliseLinkedIn(v), null, v);
  }
  assert.equal(inquirySchema.parse({ ...ok, via: "linkedin", reply: "linkedin.com/in/ana" }).reply, "https://www.linkedin.com/in/ana");
});

test("rate limit: five per ten minutes per key, then the window slides", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.ok(allow("k", t0 + i));
  assert.ok(!allow("k", t0 + 10));
  assert.ok(allow("other", t0 + 10));
  assert.ok(allow("k", t0 + 10 * 60 * 1000 + 1));
});
