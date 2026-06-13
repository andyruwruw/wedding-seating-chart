/**
 * Shareable deep-links to a specific Google Sheet.
 *
 * The attached spreadsheet ID is mirrored into the URL as `?sheet=<id>` so a
 * link can be handed to anyone the sheet is shared with. Opening that link
 * stashes the ID; once they sign in to Google the app attaches to it for them.
 *
 * Sign-in uses Google's popup token flow (no page redirect), so the query
 * string is never lost in transit — we only have to read it on load and write
 * it back when the attached sheet changes.
 */

const SHEET_PARAM = "sheet";

/** The sheet ID requested by the current URL, if any (`?sheet=<id>`). */
export function getSheetParam(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(SHEET_PARAM);
  return value && value.trim() ? value.trim() : null;
}

/**
 * Mirror the attached sheet into the URL without adding history entries.
 * Pass `null` to drop the param (e.g. after detaching).
 */
export function setSheetParam(id: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(SHEET_PARAM, id);
  else url.searchParams.delete(SHEET_PARAM);
  window.history.replaceState(null, "", url.toString());
}

/** A full, shareable link that opens the app pointed at `id`. */
export function shareLinkFor(id: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set(SHEET_PARAM, id);
  return url.toString();
}
