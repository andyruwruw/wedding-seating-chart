/** Thin wrapper over the Google Sheets v4 REST API using a Bearer token. */

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export type CellValue = string | number;

/** Thrown on a 401 so callers can refresh the token and retry. */
export class TokenExpiredError extends Error {}

interface SheetMeta {
  spreadsheetId: string;
  spreadsheetUrl?: string;
  properties?: { title?: string };
  sheets?: { properties: { title: string } }[];
}

async function api<T>(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) throw new TokenExpiredError("Google token expired.");
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = await res.json();
      detail = body?.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`Sheets API error: ${detail}`);
  }
  return res.json() as Promise<T>;
}

/** Pull a spreadsheet ID out of a full URL, or accept a bare ID. */
export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function createSpreadsheet(
  token: string,
  title: string,
  sheetTitles: string[],
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const data = await api<SheetMeta>(token, BASE, {
    method: "POST",
    body: JSON.stringify({
      properties: { title },
      sheets: sheetTitles.map((t) => ({ properties: { title: t } })),
    }),
  });
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl:
      data.spreadsheetUrl ??
      `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
    title,
  };
}

export async function getSpreadsheet(
  token: string,
  id: string,
): Promise<SheetMeta> {
  const fields = "spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title";
  return api<SheetMeta>(token, `${BASE}/${id}?fields=${fields}`);
}

/** Make sure every required tab exists, creating any that are missing. */
export async function ensureSheets(
  token: string,
  id: string,
  titles: string[],
): Promise<SheetMeta> {
  const meta = await getSpreadsheet(token, id);
  const existing = new Set((meta.sheets ?? []).map((s) => s.properties.title));
  const missing = titles.filter((t) => !existing.has(t));
  if (missing.length > 0) {
    await api(token, `${BASE}/${id}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((t) => ({ addSheet: { properties: { title: t } } })),
      }),
    });
  }
  return meta;
}

/** Overwrite a tab: clear its current contents, then write `rows` from A1. */
export async function writeTab(
  token: string,
  id: string,
  title: string,
  rows: CellValue[][],
): Promise<void> {
  const clearRange = encodeURIComponent(`'${title}'!A1:ZZ100000`);
  await api(token, `${BASE}/${id}/values/${clearRange}:clear`, {
    method: "POST",
    body: "{}",
  });
  const writeRange = encodeURIComponent(`'${title}'!A1`);
  await api(
    token,
    `${BASE}/${id}/values/${writeRange}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: rows }) },
  );
}
