const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.app.created",
];

export async function createRelayState(secret, input) {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(input)));
  const signature = await sign(secret, payload);
  return `${payload}.${signature}`;
}

export async function readRelayState(secret, value, now = Date.now()) {
  const [payload = "", signature = "", extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) throw new Error("invalid_state");
  let valid = false;
  try {
    const key = await importHmacKey(secret);
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      encoder.encode(payload),
    );
  } catch {
    throw new Error("invalid_state");
  }
  if (!valid) throw new Error("invalid_state");
  let parsed;
  try {
    parsed = JSON.parse(decoder.decode(base64UrlDecode(payload)));
  } catch {
    throw new Error("invalid_state");
  }
  if (!parsed
    || typeof parsed.clientState !== "string"
    || typeof parsed.challenge !== "string"
    || typeof parsed.expiresAt !== "number"
    || parsed.expiresAt < now) {
    throw new Error("expired_state");
  }
  return parsed;
}

export async function verifierMatchesChallenge(verifier, challenge) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64UrlEncode(new Uint8Array(digest)) === challenge;
}

export function validClientState(value) {
  return /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

export function validChallenge(value) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function oauthCallbackUrl(publicBaseUrl) {
  return new URL("oauth/callback", trailingSlash(publicBaseUrl)).toString();
}

export function pluginRedirect(pluginRedirectUri, parameters) {
  const url = new URL(pluginRedirectUri);
  for (const [key, value] of Object.entries(parameters)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(secret, value) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function importHmacKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("invalid_server_configuration");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

function trailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
