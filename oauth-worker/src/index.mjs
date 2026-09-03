import {
  GOOGLE_SCOPES,
  createRelayState,
  oauthCallbackUrl,
  pluginRedirect,
  readRelayState,
  validChallenge,
  validClientState,
  verifierMatchesChallenge,
} from "./protocol.mjs";

const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE = "https://oauth2.googleapis.com/revoke";

export default {
  async fetch(request, env) {
    try {
      validateEnvironment(env);
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ origin: publicBaseUrl(env.PUBLIC_BASE_URL).origin, protocol: 1, status: "ok" });
      }
      if (request.method === "GET" && url.pathname === "/oauth/authorize") {
        return await authorize(url, env);
      }
      if (request.method === "GET" && url.pathname === "/oauth/callback") {
        return await callback(url, env);
      }
      if (request.method === "POST" && url.pathname === "/oauth/token") {
        return await exchange(request, env);
      }
      if (request.method === "POST" && url.pathname === "/oauth/refresh") {
        return await refresh(request, env);
      }
      if (request.method === "POST" && url.pathname === "/oauth/revoke") {
        return await revoke(request);
      }
      return json({ error: "not_found" }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unexpected_error";
      return json({ error: publicError(message) }, message === "invalid_server_configuration" ? 500 : 400);
    }
  },
};

async function authorize(url, env) {
  const clientState = url.searchParams.get("client_state") ?? "";
  const challenge = url.searchParams.get("code_challenge") ?? "";
  const locale = url.searchParams.get("locale") === "ko" ? "ko" : "en";
  if (!validClientState(clientState) || !validChallenge(challenge)) {
    return json({ error: "invalid_request" }, 400);
  }
  const relayState = await createRelayState(env.STATE_SECRET, {
    challenge,
    clientState,
    expiresAt: Date.now() + 10 * 60 * 1_000,
    nonce: crypto.randomUUID(),
  });
  const target = new URL(GOOGLE_AUTHORIZE);
  target.searchParams.set("access_type", "offline");
  target.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  target.searchParams.set("code_challenge", challenge);
  target.searchParams.set("code_challenge_method", "S256");
  target.searchParams.set("hl", locale);
  target.searchParams.set("prompt", "consent");
  target.searchParams.set("redirect_uri", oauthCallbackUrl(env.PUBLIC_BASE_URL));
  target.searchParams.set("response_type", "code");
  target.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  target.searchParams.set("state", relayState);
  return redirect(target.toString());
}

async function callback(url, env) {
  const relayState = url.searchParams.get("state") ?? "";
  const state = await readRelayState(env.STATE_SECRET, relayState);
  const error = url.searchParams.get("error") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!error && !code) throw new Error("invalid_callback");
  return redirect(pluginRedirect(env.PLUGIN_REDIRECT_URI, {
    code,
    error,
    relay_state: relayState,
    state: state.clientState,
  }));
}

async function exchange(request, env) {
  const body = await readJson(request);
  const code = stringValue(body.code);
  const relayState = stringValue(body.relayState);
  const verifier = stringValue(body.verifier);
  const state = await readRelayState(env.STATE_SECRET, relayState);
  if (!code || !await verifierMatchesChallenge(verifier, state.challenge)) {
    return json({ error: "invalid_grant" }, 400);
  }
  const token = await googleToken({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: oauthCallbackUrl(env.PUBLIC_BASE_URL),
  });
  return tokenResponse(token, true);
}

async function refresh(request, env) {
  const body = await readJson(request);
  const refreshToken = stringValue(body.refreshToken);
  if (!refreshToken) return json({ error: "invalid_grant" }, 400);
  const token = await googleToken({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return tokenResponse(token, false);
}

async function revoke(request) {
  const body = await readJson(request);
  const refreshToken = stringValue(body.refreshToken);
  if (!refreshToken) return json({ error: "invalid_request" }, 400);
  const response = await fetch(GOOGLE_REVOKE, {
    body: new URLSearchParams({ token: refreshToken }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!response.ok) return json({ error: "revocation_failed" }, response.status);
  return json({ revoked: true });
}

async function googleToken(parameters) {
  const response = await fetch(GOOGLE_TOKEN, {
    body: new URLSearchParams(parameters),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const body = await response.json();
  if (!response.ok) {
    const reason = typeof body.error === "string" ? body.error : "token_exchange_failed";
    throw new Error(reason);
  }
  return body;
}

function tokenResponse(token, includeRefreshToken) {
  const accessToken = stringValue(token.access_token);
  const expiresIn = Number(token.expires_in);
  const refreshToken = includeRefreshToken ? stringValue(token.refresh_token) : "";
  if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0 || (includeRefreshToken && !refreshToken)) {
    return json({ error: "invalid_token_response" }, 502);
  }
  const scopes = stringValue(token.scope).split(/\s+/).filter(Boolean);
  return json({
    accessToken,
    expiresIn,
    refreshToken,
    scopes: scopes.length ? scopes : GOOGLE_SCOPES,
  });
}

async function readJson(request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    throw new Error("invalid_content_type");
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4_096) throw new Error("request_too_large");
  const text = await request.text();
  if (text.length > 4_096) throw new Error("request_too_large");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("invalid_request");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_request");
  return value;
}

function validateEnvironment(env) {
  if (!env
    || typeof env.GOOGLE_CLIENT_ID !== "string"
    || typeof env.GOOGLE_CLIENT_SECRET !== "string"
    || typeof env.STATE_SECRET !== "string"
    || env.STATE_SECRET.length < 32
    || env.PLUGIN_REDIRECT_URI !== "obsidian://link-calendar-google") {
    throw new Error("invalid_server_configuration");
  }
  publicBaseUrl(env.PUBLIC_BASE_URL);
}

function publicBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_server_configuration");
  }
  if (url.protocol !== "https:"
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash) {
    throw new Error("invalid_server_configuration");
  }
  return url;
}

function json(value, status = 200) {
  return Response.json(value, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
    status,
  });
}

function redirect(location) {
  return new Response(null, {
    headers: {
      "Cache-Control": "no-store",
      Location: location,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
    status: 302,
  });
}

function publicError(message) {
  const allowed = new Set([
    "access_denied",
    "expired_state",
    "invalid_callback",
    "invalid_content_type",
    "invalid_grant",
    "invalid_request",
    "invalid_server_configuration",
    "invalid_state",
    "request_too_large",
  ]);
  return allowed.has(message) ? message : "request_failed";
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}
