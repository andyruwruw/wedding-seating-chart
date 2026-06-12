/**
 * Google Identity Services (browser OAuth) token management.
 *
 * No backend: we load the GIS script, obtain a short-lived access token via the
 * implicit token flow, and use it as a Bearer token against the Sheets REST API.
 * The token lives in module scope (not persisted) and is refreshed on demand.
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

let tokenClient: GisTokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiresAt = 0;
let scriptPromise: Promise<void> | null = null;
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null =
  null;

/** Whether a Client ID has been configured (build-time env). */
export function isConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function init(): Promise<void> {
  if (!CLIENT_ID) throw new Error("Missing VITE_GOOGLE_CLIENT_ID.");
  await loadScript();
  if (tokenClient) return;
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        pending?.reject(new Error(resp.error));
      } else {
        accessToken = resp.access_token;
        tokenExpiresAt = Date.now() + resp.expires_in * 1000;
        pending?.resolve(accessToken);
      }
      pending = null;
    },
    error_callback: (err) => {
      pending?.reject(new Error(err?.type ?? "Google sign-in was cancelled."));
      pending = null;
    },
  });
}

/** True if we hold a token that won't expire in the next minute. */
function hasValidToken(): boolean {
  return Boolean(accessToken) && Date.now() < tokenExpiresAt - 60_000;
}

/** Force the consent / token popup and resolve with a fresh access token. */
export async function requestToken(): Promise<string> {
  await init();
  return new Promise<string>((resolve, reject) => {
    if (!tokenClient) return reject(new Error("Google not initialised."));
    pending = { resolve, reject };
    tokenClient.requestAccessToken();
  });
}

/** Return a usable token, refreshing only if the current one is missing/stale. */
export async function ensureToken(): Promise<string> {
  if (hasValidToken()) return accessToken as string;
  return requestToken();
}

/** Return the current token only if it's valid — never prompts. For background polling. */
export function getValidToken(): string | null {
  return hasValidToken() ? accessToken : null;
}

/** Drop the cached token (e.g. after a 401) so the next call re-requests one. */
export function invalidateToken(): void {
  accessToken = null;
  tokenExpiresAt = 0;
}

export function signOut(): void {
  if (accessToken && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(accessToken);
  }
  invalidateToken();
}
