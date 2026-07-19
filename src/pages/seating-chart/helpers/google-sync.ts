import { useAppStore } from "../../../store/use-app-store";
import { ensureToken, invalidateToken } from "../../../lib/google/gis";
import {
  ensureSheets,
  readTab,
  writeTab,
  TokenExpiredError,
} from "../../../lib/google/sheets";
import {
  connectionRows,
  guestRows,
  lockedRows,
  seatingRows,
  SHEET_TAB_LIST,
  SHEET_TABS,
} from "./sheet-export";
import { snapshotFromTabs, snapshotSignature } from "./sheet-import";

let syncing = false;
let queued = false;

/**
 * Push app state to the attached Google Sheet, pulling any external edits
 * first so we don't clobber them. Refreshes the token once on a 401.
 *
 * Module-level (not a hook) so it can be triggered from anywhere — the
 * Google Sheets panel and the quick sync button on the Guests tab both call
 * into this same in-flight guard, regardless of which is mounted.
 */
export async function pushAllToSheet(): Promise<void> {
  const id = useAppStore.getState().google.spreadsheetId;
  if (!id) return;
  if (syncing) {
    queued = true;
    return;
  }
  syncing = true;
  const { setGoogle, loadSnapshot } = useAppStore.getState();
  setGoogle({ status: "syncing", error: null });

  const doWrites = async (token: string) => {
    const { guests: gs, connections: cs, result: rs, config, lockedTables: lts } =
      useAppStore.getState();
    const lastSig = useAppStore.getState().google.lastSig;
    const appSig = snapshotSignature(gs, cs);

    // If the sheet's editable data changed under us, adopt it instead.
    const gRows = await readTab(token, id, SHEET_TABS.guests).catch(() => []);
    const cRows = await readTab(token, id, SHEET_TABS.connections).catch(() => []);
    const lRows = await readTab(token, id, SHEET_TABS.locked).catch(() => []);
    const sheetSnap = snapshotFromTabs(gRows, cRows, lRows);
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
    // Locked tables can change (lock/unlock a table) without touching guest
    // names or connections, so this is written every push, not gated on appSig.
    await writeTab(token, id, SHEET_TABS.locked, lockedRows(gs, lts));
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
    syncing = false;
    if (queued) {
      queued = false;
      pushAllToSheet();
    }
  }
}
