import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { TextField } from "../../../components/form/text-field";
import { useAppStore } from "../../../store/use-app-store";
import {
  ensureToken,
  getValidToken,
  invalidateToken,
  isConfigured,
  requestToken,
  signOut,
} from "../../../lib/google/gis";
import {
  createSpreadsheet,
  ensureSheets,
  extractSpreadsheetId,
  getSpreadsheet,
  isSpreadsheetEmpty,
  readTab,
  TokenExpiredError,
  writeTab,
} from "../../../lib/google/sheets";
import {
  connectionRows,
  guestRows,
  seatingRows,
  SHEET_TAB_LIST,
  SHEET_TABS,
} from "../helpers/sheet-export";
import { snapshotFromTabs, snapshotSignature } from "../helpers/sheet-import";
import {
  getSheetParam,
  setSheetParam,
  shareLinkFor,
} from "../../../lib/share-link";

const NEW_SHEET_TITLE = "Wedding Seating Chart";
const SYNC_DEBOUNCE_MS = 1500;
const POLL_MS = 7000;

export function GoogleSyncPanel() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);
  const google = useAppStore((s) => s.google);
  const setGoogle = useAppStore((s) => s.setGoogle);
  const resetGoogle = useAppStore((s) => s.resetGoogle);
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);

  const [urlInput, setUrlInput] = useState("");
  // A sheet ID handed to us via `?sheet=<id>` — auto-attached after sign-in.
  const [pendingSheetId] = useState(() => getSheetParam());
  const [copied, setCopied] = useState(false);
  const autoAttached = useRef(false);
  const syncing = useRef(false);
  const queued = useRef(false);

  const configured = isConfigured();

  // Push app → sheet, but pull external Guests/Connections edits first rather
  // than clobber them. Refreshes the token once on a 401.
  const pushAll = useCallback(async () => {
    const id = useAppStore.getState().google.spreadsheetId;
    if (!id) return;
    if (syncing.current) {
      queued.current = true;
      return;
    }
    syncing.current = true;
    setGoogle({ status: "syncing", error: null });

    const doWrites = async (token: string) => {
      const { guests: gs, connections: cs, result: rs, config } =
        useAppStore.getState();
      const lastSig = useAppStore.getState().google.lastSig;
      const appSig = snapshotSignature(gs, cs);

      // If the sheet's editable data changed under us, adopt it instead.
      const gRows = await readTab(token, id, SHEET_TABS.guests).catch(() => []);
      const cRows = await readTab(token, id, SHEET_TABS.connections).catch(() => []);
      const sheetSnap = snapshotFromTabs(gRows, cRows);
      if (sheetSnap.guests.length > 0) {
        const sheetSig = snapshotSignature(sheetSnap.guests, sheetSnap.connections);
        if (sheetSig !== lastSig && sheetSig !== appSig) {
          loadSnapshot(sheetSnap, false);
          setGoogle({
            lastSig: sheetSig,
            status: "synced",
            lastSyncedAt: Date.now(),
          });
          return;
        }
      }

      await ensureSheets(token, id, SHEET_TAB_LIST);
      await writeTab(
        token,
        id,
        SHEET_TABS.seating,
        seatingRows(gs, cs, rs, config.taper, config.fomo, config.worstCaseScore),
      );
      if (appSig !== lastSig) {
        await writeTab(token, id, SHEET_TABS.guests, guestRows(gs, cs, rs));
        await writeTab(token, id, SHEET_TABS.connections, connectionRows(gs, cs));
      }
      setGoogle({
        status: "synced",
        lastSyncedAt: Date.now(),
        lastSig: appSig,
        error: null,
      });
    };

    try {
      let token = await ensureToken();
      try {
        await doWrites(token);
      } catch (err) {
        if (err instanceof TokenExpiredError) {
          invalidateToken();
          token = await ensureToken();
          await doWrites(token);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setGoogle({ status: "error", error: (err as Error).message });
    } finally {
      syncing.current = false;
      if (queued.current) {
        queued.current = false;
        pushAll();
      }
    }
  }, [setGoogle, loadSnapshot]);

  // Poll the sheet and pull in external edits (silent — never prompts).
  const pullFromSheet = useCallback(async () => {
    const { spreadsheetId: id, lastSig } = useAppStore.getState().google;
    if (!id || syncing.current) return;
    const token = getValidToken();
    if (!token) return;
    try {
      const gRows = await readTab(token, id, SHEET_TABS.guests);
      const cRows = await readTab(token, id, SHEET_TABS.connections);
      const snap = snapshotFromTabs(gRows, cRows);
      if (snap.guests.length === 0) return;
      const sheetSig = snapshotSignature(snap.guests, snap.connections);
      if (sheetSig !== lastSig) {
        loadSnapshot(snap, false);
        setGoogle({ lastSig: sheetSig, status: "synced", lastSyncedAt: Date.now() });
      }
    } catch {
      /* transient poll error — try again next tick */
    }
  }, [setGoogle, loadSnapshot]);

  // Debounced live push whenever app data changes.
  useEffect(() => {
    if (!google.autoSync || !google.spreadsheetId) return;
    const timer = setTimeout(pushAll, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [guests, connections, result, google.autoSync, google.spreadsheetId, pushAll]);

  // Poll for external sheet edits.
  useEffect(() => {
    if (!google.livePull || !google.spreadsheetId) return;
    pullFromSheet();
    const timer = setInterval(pullFromSheet, POLL_MS);
    return () => clearInterval(timer);
  }, [google.livePull, google.spreadsheetId, pullFromSheet]);

  const connect = async () => {
    try {
      setGoogle({ error: null });
      await requestToken();
      setGoogle({ signedIn: true });
    } catch (err) {
      setGoogle({ error: (err as Error).message });
    }
  };

  const createNew = async () => {
    try {
      setGoogle({ status: "syncing", error: null });
      const token = await ensureToken();
      const sheet = await createSpreadsheet(token, NEW_SHEET_TITLE, SHEET_TAB_LIST);
      setGoogle({
        signedIn: true,
        spreadsheetId: sheet.spreadsheetId,
        spreadsheetUrl: sheet.spreadsheetUrl,
        spreadsheetTitle: sheet.title,
      });
      pushAll();
    } catch (err) {
      setGoogle({ status: "error", error: (err as Error).message });
    }
  };

  const attachExisting = useCallback(
    async (source?: string) => {
    const id = extractSpreadsheetId(source ?? urlInput);
    if (!id) {
      setGoogle({ error: "Couldn't read a Sheet ID from that link." });
      return;
    }
    try {
      setGoogle({ status: "syncing", error: null });
      const token = await ensureToken();
      const meta = await getSpreadsheet(token, id);
      const titles = (meta.sheets ?? []).map((s) => s.properties.title);
      const title = meta.properties?.title ?? "Spreadsheet";
      const url =
        meta.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${id}`;

      // 1) Looks like one of our sheets → import it instead of overwriting.
      if (
        titles.includes(SHEET_TABS.guests) &&
        titles.includes(SHEET_TABS.connections)
      ) {
        const gRows = await readTab(token, id, SHEET_TABS.guests);
        const cRows = await readTab(token, id, SHEET_TABS.connections);
        // Trust it only if the headers match what we write.
        const ours =
          (gRows[0]?.[0] ?? "").trim().toLowerCase() === "name" ||
          (cRows[0]?.[0] ?? "").trim().toLowerCase() === "source";
        if (ours) {
          const snapshot = snapshotFromTabs(gRows, cRows);
          if (snapshot.guests.length > 0) {
            loadSnapshot(snapshot, false);
            setGoogle({
              signedIn: true,
              spreadsheetId: id,
              spreadsheetUrl: url,
              spreadsheetTitle: title,
              status: "synced",
              lastSyncedAt: Date.now(),
              lastSig: snapshotSignature(snapshot.guests, snapshot.connections),
              error: null,
            });
            setUrlInput("");
            return;
          }
        }
      }

      // 2) Not importable → only attach if the sheet is genuinely empty.
      const empty = await isSpreadsheetEmpty(token, id, titles);
      if (!empty) {
        throw new Error(
          `“${title}” already has data I can’t read as a seating chart, so I won’t overwrite it. Attach an empty sheet, or clear/export this one first.`,
        );
      }

      setGoogle({
        signedIn: true,
        spreadsheetId: id,
        spreadsheetUrl: url,
        spreadsheetTitle: title,
      });
      setUrlInput("");
      pushAll();
    } catch (err) {
      setGoogle({ status: "error", error: (err as Error).message });
    }
    },
    [urlInput, setGoogle, loadSnapshot, pushAll],
  );

  // A shared `?sheet=<id>` link: once signed in, attach to it automatically.
  useEffect(() => {
    if (!pendingSheetId) return;
    const { signedIn, spreadsheetId } = google;
    if (!signedIn || spreadsheetId || autoAttached.current) return;
    autoAttached.current = true;
    setUrlInput(pendingSheetId); // fallback if the auto-attach fails
    attachExisting(pendingSheetId);
  }, [pendingSheetId, google, attachExisting]);

  // Mirror the attached sheet into the URL so the link is shareable, and clear
  // it when nothing is attached.
  useEffect(() => {
    setSheetParam(google.spreadsheetId);
  }, [google.spreadsheetId]);

  const copyShareLink = async () => {
    const id = useAppStore.getState().google.spreadsheetId;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(shareLinkFor(id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the URL bar still holds the link */
    }
  };

  const detach = () =>
    setGoogle({
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetTitle: null,
      status: "idle",
      error: null,
      lastSyncedAt: null,
      lastSig: null,
    });

  const disconnect = () => {
    signOut();
    resetGoogle();
  };

  const statusText = (() => {
    switch (google.status) {
      case "syncing":
        return "Syncing…";
      case "synced":
        return google.lastSyncedAt
          ? `Synced ${new Date(google.lastSyncedAt).toLocaleTimeString()}`
          : "Synced";
      case "error":
        return google.error ?? "Error";
      default:
        return google.spreadsheetId ? "Ready" : "";
    }
  })();

  if (!configured) {
    return (
      <Panel title="Google Sheets" subtitle="not configured">
        <p className="empty-hint">
          Set <code className="inline-code">VITE_GOOGLE_CLIENT_ID</code> in a{" "}
          <code className="inline-code">.env.local</code> file (and restart the dev
          server) to enable live syncing to Google Sheets. See the README for the
          ~5-minute Google Cloud setup.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Google Sheets"
      subtitle={statusText}
      actions={
        google.signedIn && (
          <Button small variant="ghost" onClick={disconnect}>
            Disconnect
          </Button>
        )
      }
    >
      {!google.signedIn && (
        <>
          {pendingSheetId && (
            <p className="share-banner">
              A shared seating chart is ready. Connect Google to load it — make
              sure the sheet has been shared with your account.
            </p>
          )}
          <Button variant="primary" block onClick={connect}>
            Connect Google
          </Button>
          <p className="empty-hint">
            {pendingSheetId
              ? "After you sign in, the shared sheet loads automatically."
              : "Sign in to create or attach a spreadsheet. Results, guests, and connections sync live to its tabs."}
          </p>
        </>
      )}

      {google.signedIn && !google.spreadsheetId && (
        <>
          <Button variant="primary" block onClick={createNew}>
            ＋ Create new spreadsheet
          </Button>
          <div className="sync-divider">
            <span>or attach existing</span>
          </div>
          <div className="attach-existing">
            <TextField
              placeholder="Paste Google Sheet URL or ID"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <Button onClick={() => attachExisting()} disabled={!urlInput.trim()}>
              Attach
            </Button>
          </div>
          <p className="empty-hint">
            A sheet already holding a seating chart is imported. A sheet with
            other data is left untouched — it won’t be overwritten.
          </p>
        </>
      )}

      {google.signedIn && google.spreadsheetId && (
        <>
          <a
            className="sheet-link"
            href={google.spreadsheetUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
          >
            <span className="sheet-link-title">
              {google.spreadsheetTitle ?? "Spreadsheet"}
            </span>
            <span className="sheet-link-open">Open ↗</span>
          </a>

          <Button small variant="ghost" block onClick={copyShareLink}>
            {copied ? "Link copied ✓" : "Copy share link"}
          </Button>
          <p className="empty-hint">
            Anyone you share the sheet with can open this link and sign in to see
            it live.
          </p>

          <label className="sync-toggle">
            <input
              type="checkbox"
              checked={google.autoSync}
              onChange={(e) => setGoogle({ autoSync: e.target.checked })}
            />
            <span>Push my changes to the sheet</span>
          </label>
          <label className="sync-toggle">
            <input
              type="checkbox"
              checked={google.livePull}
              onChange={(e) => setGoogle({ livePull: e.target.checked })}
            />
            <span>Pull edits made in the sheet</span>
          </label>

          <div className="generate-row">
            <Button
              variant="primary"
              block
              onClick={pushAll}
              disabled={google.status === "syncing"}
            >
              {google.status === "syncing" ? "Syncing…" : "Sync now"}
            </Button>
            <Button onClick={detach} aria-label="Detach spreadsheet">
              ✕
            </Button>
          </div>

          {google.status === "error" && (
            <p className="sync-error">{google.error}</p>
          )}
        </>
      )}
    </Panel>
  );
}
