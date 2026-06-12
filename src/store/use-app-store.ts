import { create } from "zustand";
import type {
  Connection,
  Guest,
  GraphSettings,
  ProjectSnapshot,
  SeatingConfig,
  SeatingResult,
} from "../types";
import { solveSeating } from "../pages/seating-chart/helpers/seating";
import { valueForLabel } from "../components/form/config/relationship-tiers";

/** Stable, order-independent key for an undirected guest pair. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function makeSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/** UI state for the Google Sheets live-sync integration (token lives in gis.ts). */
export interface GoogleSyncState {
  signedIn: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string | null;
  autoSync: boolean;
  /** Poll the sheet and pull in external edits to the Guests/Connections tabs. */
  livePull: boolean;
  /** Name-based signature of the last state app and sheet agreed on. */
  lastSig: string | null;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
}

const DEFAULT_GOOGLE: GoogleSyncState = {
  signedIn: false,
  spreadsheetId: null,
  spreadsheetUrl: null,
  spreadsheetTitle: null,
  autoSync: true,
  livePull: true,
  lastSig: null,
  status: "idle",
  error: null,
  lastSyncedAt: null,
};

interface AppState {
  guests: Guest[];
  connections: Connection[];
  config: SeatingConfig;
  result: SeatingResult | null;
  isGenerating: boolean;
  selectedGuestId: string | null;
  graphSettings: GraphSettings;
  google: GoogleSyncState;

  addGuest: (name: string) => Guest | null;
  removeGuest: (id: string) => void;
  renameGuest: (id: string, name: string) => void;
  setGuestFomo: (id: string, fomo: number) => void;
  selectGuest: (id: string | null) => void;

  setConnection: (source: string, target: string, label: string) => void;
  removeConnection: (source: string, target: string) => void;
  /**
   * Connect every pair among `ids` with `label` (a clique). Existing pairs are
   * left untouched unless `overwrite` is true. Returns how many were added/changed.
   */
  addGroupConnections: (
    ids: string[],
    label: string,
    overwrite: boolean,
  ) => number;

  setConfig: (patch: Partial<SeatingConfig>) => void;
  setGraphSettings: (patch: Partial<GraphSettings>) => void;
  resetGraphSettings: () => void;
  setGoogle: (patch: Partial<GoogleSyncState>) => void;
  resetGoogle: () => void;

  generate: () => void;
  regenerate: () => void;

  loadSnapshot: (snapshot: ProjectSnapshot, merge?: boolean) => void;
  clearAll: () => void;
}

const DEFAULT_CONFIG: SeatingConfig = {
  seatsPerTable: 10,
  tableCount: 15,
  autoTables: true,
  allowEmptySeats: true,
  effort: "balanced",
  taper: 2,
  fomo: 1,
  worstCaseScore: false,
  cohesion: 1,
};

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  centerForce: 0.15,
  repelForce: 100,
  linkForce: 0.10,
  linkDistance: 20,
};

export const useAppStore = create<AppState>((set, get) => ({
  guests: [],
  connections: [],
  config: DEFAULT_CONFIG,
  result: null,
  isGenerating: false,
  selectedGuestId: null,
  graphSettings: DEFAULT_GRAPH_SETTINGS,
  google: DEFAULT_GOOGLE,

  addGuest: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const exists = get().guests.some(
      (g) => g.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return null;
    const guest: Guest = { id: makeId(), name: trimmed, fomo: 1 };
    set((s) => ({ guests: [...s.guests, guest] }));
    return guest;
  },

  removeGuest: (id) =>
    set((s) => ({
      guests: s.guests.filter((g) => g.id !== id),
      connections: s.connections.filter(
        (c) => c.source !== id && c.target !== id,
      ),
      selectedGuestId: s.selectedGuestId === id ? null : s.selectedGuestId,
      result: null,
    })),

  renameGuest: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      guests: s.guests.map((g) => (g.id === id ? { ...g, name: trimmed } : g)),
    }));
  },

  setGuestFomo: (id, fomo) =>
    set((s) => ({
      guests: s.guests.map((g) => (g.id === id ? { ...g, fomo } : g)),
    })),

  selectGuest: (id) => set({ selectedGuestId: id }),

  setConnection: (source, target, label) => {
    if (source === target) return;
    const value = valueForLabel(label);
    set((s) => {
      const key = pairKey(source, target);
      const rest = s.connections.filter(
        (c) => pairKey(c.source, c.target) !== key,
      );
      return {
        connections: [...rest, { source, target, value, label }],
        result: null,
      };
    });
  },

  removeConnection: (source, target) =>
    set((s) => {
      const key = pairKey(source, target);
      return {
        connections: s.connections.filter(
          (c) => pairKey(c.source, c.target) !== key,
        ),
        result: null,
      };
    }),

  addGroupConnections: (ids, label, overwrite) => {
    if (ids.length < 2) return 0;
    const value = valueForLabel(label);
    const byPair = new Map(
      get().connections.map((c) => [pairKey(c.source, c.target), c] as const),
    );
    let changed = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        if (a === b) continue;
        const key = pairKey(a, b);
        if (byPair.has(key) && !overwrite) continue;
        byPair.set(key, { source: a, target: b, value, label });
        changed++;
      }
    }
    if (changed > 0) {
      set({ connections: [...byPair.values()], result: null });
    }
    return changed;
  },

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  setGraphSettings: (patch) =>
    set((s) => ({ graphSettings: { ...s.graphSettings, ...patch } })),

  resetGraphSettings: () => set({ graphSettings: DEFAULT_GRAPH_SETTINGS }),

  setGoogle: (patch) => set((s) => ({ google: { ...s.google, ...patch } })),

  resetGoogle: () => set({ google: DEFAULT_GOOGLE }),

  generate: () => {
    // Defer the (synchronous, possibly heavy) solve so the UI can paint the
    // loading overlay before the main thread blocks on it.
    set({ isGenerating: true });
    setTimeout(() => {
      const { guests, connections, config } = get();
      set({
        result: solveSeating(guests, connections, config, makeSeed()),
        isGenerating: false,
      });
    }, 0);
  },

  regenerate: () => {
    set({ isGenerating: true });
    setTimeout(() => {
      const { guests, connections, config } = get();
      set({
        result: solveSeating(guests, connections, config, makeSeed()),
        isGenerating: false,
      });
    }, 0);
  },

  loadSnapshot: (snapshot, merge = false) =>
    set((s) => {
      if (!merge) {
        return {
          guests: snapshot.guests,
          connections: snapshot.connections,
          result: null,
          selectedGuestId: null,
        };
      }
      // Merge: keep existing, append guests/connections not already present.
      const byName = new Map(
        s.guests.map((g) => [g.name.toLowerCase(), g] as const),
      );
      const guests = [...s.guests];
      for (const g of snapshot.guests) {
        if (!byName.has(g.name.toLowerCase())) {
          byName.set(g.name.toLowerCase(), g);
          guests.push(g);
        }
      }
      const seen = new Set(
        s.connections.map((c) => pairKey(c.source, c.target)),
      );
      const connections = [...s.connections];
      for (const c of snapshot.connections) {
        const key = pairKey(c.source, c.target);
        if (!seen.has(key)) {
          seen.add(key);
          connections.push(c);
        }
      }
      return { guests, connections, result: null };
    }),

  clearAll: () =>
    set({
      guests: [],
      connections: [],
      result: null,
      selectedGuestId: null,
    }),
}));
