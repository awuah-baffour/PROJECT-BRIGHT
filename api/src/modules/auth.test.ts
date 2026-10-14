import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, sessionLifetimeMs, verifyPassword } from "./auth.js";
import { normalizePhone } from "./identity.js";

test("normalizes Ghanaian local phone numbers and preserves international numbers", () => {
  assert.equal(normalizePhone("020 123 4567"), "+233201234567");
  assert.equal(normalizePhone("+1 (415) 555-2671"), "+14155552671");
  assert.equal(normalizePhone("not-a-phone"), null);
});

test("stores password hashes and verifies only the matching password", async () => {
  const password = "Correct-Horse-Battery";
  const encoded = await hashPassword(password);
  assert.notEqual(encoded, password);
  assert.match(encoded, /^scrypt\$/);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword("incorrect-password", encoded), false);
  assert.equal(await verifyPassword(password, "invalid-hash"), false);
});

test("expires sessions after 30 days", () => {
  assert.equal(sessionLifetimeMs, 30 * 24 * 60 * 60 * 1000);
});
