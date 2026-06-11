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
  status: "idle",
  error: null,
  lastSyncedAt: null,
};

interface AppState {
  guests: Guest[];
  connections: Connection[];
  config: SeatingConfig;
  result: SeatingResult | null;
  selectedGuestId: string | null;
  graphSettings: GraphSettings;
  google: GoogleSyncState;

  addGuest: (name: string) => Guest | null;
  removeGuest: (id: string) => void;
  renameGuest: (id: string, name: string) => void;
  selectGuest: (id: string | null) => void;

  setConnection: (source: string, target: string, label: string) => void;
  removeConnection: (source: string, target: string) => void;

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
    const guest: Guest = { id: makeId(), name: trimmed };
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

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  setGraphSettings: (patch) =>
    set((s) => ({ graphSettings: { ...s.graphSettings, ...patch } })),

  resetGraphSettings: () => set({ graphSettings: DEFAULT_GRAPH_SETTINGS }),

  setGoogle: (patch) => set((s) => ({ google: { ...s.google, ...patch } })),

  resetGoogle: () => set({ google: DEFAULT_GOOGLE }),

  generate: () => {
    const { guests, connections, config } = get();
    const seed = makeSeed();
    set({ result: solveSeating(guests, connections, config, seed) });
  },

  regenerate: () => {
    const { guests, connections, config } = get();
    const seed = makeSeed();
    set({ result: solveSeating(guests, connections, config, seed) });
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
