import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { TextField } from "../../../components/form/text-field";
import { useAppStore } from "../../../store/use-app-store";
import {
  ensureToken,
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

const NEW_SHEET_TITLE = "Wedding Seating Chart";
const SYNC_DEBOUNCE_MS = 1500;

export function GoogleSyncPanel() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);
  const google = useAppStore((s) => s.google);
  const setGoogle = useAppStore((s) => s.setGoogle);
  const resetGoogle = useAppStore((s) => s.resetGoogle);

  const [urlInput, setUrlInput] = useState("");
  const syncing = useRef(false);
  const queued = useRef(false);

  const configured = isConfigured();

  // Write all three tabs. Refreshes the token once on a 401.
  const pushAll = useCallback(async () => {
    const id = useAppStore.getState().google.spreadsheetId;
    if (!id) return;
    if (syncing.current) {
      queued.current = true;
      return;
    }
    syncing.current = true;
    setGoogle({ status: "syncing", error: null });

    const { guests: gs, connections: cs, result: rs } = useAppStore.getState();
    const doWrites = async (token: string) => {
      await ensureSheets(token, id, SHEET_TAB_LIST);
      await writeTab(token, id, SHEET_TABS.seating, seatingRows(gs, cs, rs));
      await writeTab(token, id, SHEET_TABS.guests, guestRows(gs, cs, rs));
      await writeTab(token, id, SHEET_TABS.connections, connectionRows(gs, cs));
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
      setGoogle({ status: "synced", lastSyncedAt: Date.now(), error: null });
    } catch (err) {
      setGoogle({ status: "error", error: (err as Error).message });
    } finally {
      syncing.current = false;
      if (queued.current) {
        queued.current = false;
        pushAll();
      }
    }
  }, [setGoogle]);

  // Debounced live sync whenever the data changes.
  useEffect(() => {
    if (!google.autoSync || !google.spreadsheetId) return;
    const timer = setTimeout(pushAll, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [guests, connections, result, google.autoSync, google.spreadsheetId, pushAll]);

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

  const attachExisting = async () => {
    const id = extractSpreadsheetId(urlInput);
    if (!id) {
      setGoogle({ error: "Couldn't read a Sheet ID from that link." });
      return;
    }
    try {
      setGoogle({ status: "syncing", error: null });
      const token = await ensureToken();
      await ensureSheets(token, id, SHEET_TAB_LIST);
      const meta = await getSpreadsheet(token, id);
      setGoogle({
        signedIn: true,
        spreadsheetId: id,
        spreadsheetUrl:
          meta.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${id}`,
        spreadsheetTitle: meta.properties?.title ?? "Spreadsheet",
      });
      setUrlInput("");
      pushAll();
    } catch (err) {
      setGoogle({ status: "error", error: (err as Error).message });
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
          <Button variant="primary" block onClick={connect}>
            Connect Google
          </Button>
          <p className="empty-hint">
            Sign in to create or attach a spreadsheet. Results, guests, and
            connections sync live to its tabs.
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
            <Button onClick={attachExisting} disabled={!urlInput.trim()}>
              Attach
            </Button>
          </div>
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

          <label className="sync-toggle">
            <input
              type="checkbox"
              checked={google.autoSync}
              onChange={(e) => setGoogle({ autoSync: e.target.checked })}
            />
            <span>Live sync on every change</span>
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
