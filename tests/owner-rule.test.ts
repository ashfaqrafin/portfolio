import assert from "node:assert/strict";
import { test } from "node:test";
import { isOwnerProfileId } from "../lib/auth/owner-rule.ts";

const OWNER = "82702762";

test("the owner's numeric id matches, as a number or a string", () => {
  assert.equal(isOwnerProfileId(82702762, OWNER), true);
  assert.equal(isOwnerProfileId("82702762", OWNER), true);
  assert.equal(isOwnerProfileId(82702762, " 82702762 "), true);
});

test("any other account is rejected", () => {
  assert.equal(isOwnerProfileId(1, OWNER), false);
  assert.equal(isOwnerProfileId(82702763, OWNER), false);
  assert.equal(isOwnerProfileId("8270276", OWNER), false);
  assert.equal(isOwnerProfileId("827027620", OWNER), false);
});

test("fails closed when OWNER_GITHUB_ID is missing, empty or not numeric", () => {
  for (const bad of [undefined, null, "", "   ", "ashfaqrafin", "0", "-82702762", "82702762abc", "8.27e7", 0, NaN]) {
    assert.equal(isOwnerProfileId(82702762, bad), false, `owner id ${String(bad)} must not match`);
    assert.equal(isOwnerProfileId(bad, bad), false, `${String(bad)} vs itself must not match`);
  }
});

test("usernames, emails and junk are never identities", () => {
  for (const id of ["ashfaqrafin", "ashfaq@example.com", "", " ", null, undefined, {}, [], 82702762.5, -82702762, Infinity, true]) {
    assert.equal(isOwnerProfileId(id, OWNER), false, `profile id ${JSON.stringify(id)} must not match`);
  }
});
