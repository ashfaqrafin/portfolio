import assert from "node:assert/strict";
import { test } from "node:test";
import { allow } from "../lib/inbox/rate-limit.ts";
import { inquirySchema, normaliseSocial, normaliseWhatsApp } from "../lib/inbox/schema.ts";

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
  assert.ok(bad({ via: "social", reply: "https://evil.example/in/me" }));
  assert.ok(bad({ via: "linkedin", reply: "https://www.linkedin.com/in/me" }));
  assert.ok(bad({ via: "whatsapp", reply: "call me maybe" }));
});

test("inquiry: social links are limited to profile sites and normalised", () => {
  for (const [v, want] of [
    ["linkedin.com/in/ana", "https://www.linkedin.com/in/ana"],
    ["https://www.linkedin.com/in/ana/", "https://www.linkedin.com/in/ana"],
    ["http://bd.linkedin.com/in/ana", "https://www.linkedin.com/in/ana"],
    ["github.com/ana", "https://github.com/ana"],
    ["https://www.instagram.com/ana.makes/", "https://instagram.com/ana.makes"],
  ]) {
    assert.equal(normaliseSocial(v), want, v);
  }
  for (const v of ["javascript:alert(1)", "https://linkedin.com.evil.dev/in/ana", "https://evil.dev/github.com/ana", "linkedin.com", "https://user:pw@github.com/ana"]) {
    assert.equal(normaliseSocial(v), null, v);
  }
  // queries and fragments are dropped, never kept
  assert.equal(normaliseSocial("https://github.com/ana?x=<script>#y"), "https://github.com/ana");
  assert.equal(inquirySchema.parse({ ...ok, via: "social", reply: "linkedin.com/in/ana" }).reply, "https://www.linkedin.com/in/ana");
});

test("inquiry: WhatsApp numbers keep their digits and country code", () => {
  assert.equal(normaliseWhatsApp("+880 1712-345678"), "+8801712345678");
  assert.equal(normaliseWhatsApp("(017) 1234 5678"), "01712345678");
  for (const v of ["12345", "+1 (555) call-me", "1234567890123456"]) assert.equal(normaliseWhatsApp(v), null, v);
  assert.equal(inquirySchema.parse({ ...ok, via: "whatsapp", reply: "+880 1712 345678" }).reply, "+8801712345678");
});

test("rate limit: five per ten minutes per key, then the window slides", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.ok(allow("k", t0 + i));
  assert.ok(!allow("k", t0 + 10));
  assert.ok(allow("other", t0 + 10));
  assert.ok(allow("k", t0 + 10 * 60 * 1000 + 1));
});
