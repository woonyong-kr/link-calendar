import assert from "node:assert/strict";
import test from "node:test";

import {
  createRelayState,
  oauthCallbackUrl,
  pluginRedirect,
  readRelayState,
  validChallenge,
  validClientState,
  verifierMatchesChallenge,
} from "../src/protocol.mjs";

const secret = "a-secure-state-secret-that-is-long-enough";

test("relay state round-trips and expires", async () => {
  const state = await createRelayState(secret, {
    challenge: "A".repeat(43),
    clientState: "B".repeat(43),
    expiresAt: 2_000,
  });
  assert.deepEqual(await readRelayState(secret, state, 1_000), {
    challenge: "A".repeat(43),
    clientState: "B".repeat(43),
    expiresAt: 2_000,
  });
  await assert.rejects(readRelayState(secret, state, 2_001), /expired_state/);
  await assert.rejects(readRelayState(`${secret}x`, state, 1_000), /invalid_state/);
});

test("PKCE verifier must match the signed challenge", async () => {
  const verifier = "v".repeat(64);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  const challenge = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  assert.equal(await verifierMatchesChallenge(verifier, challenge), true);
  assert.equal(await verifierMatchesChallenge(`${verifier}x`, challenge), false);
  assert.equal(await verifierMatchesChallenge("short", challenge), false);
});

test("request values and redirects are bounded", () => {
  assert.equal(validClientState("a".repeat(43)), true);
  assert.equal(validClientState("has spaces"), false);
  assert.equal(validChallenge("a".repeat(43)), true);
  assert.equal(validChallenge("a".repeat(42)), false);
  assert.equal(oauthCallbackUrl("https://relay.example"), "https://relay.example/oauth/callback");
  assert.equal(
    pluginRedirect("obsidian://link-calendar-google", { code: "a b", state: "state" }),
    "obsidian://link-calendar-google?code=a+b&state=state",
  );
});
