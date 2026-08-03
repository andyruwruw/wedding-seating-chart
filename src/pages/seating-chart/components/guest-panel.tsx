import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { useAppStore } from "../../../store/use-app-store";
import { tableColor, fomoLevel, nextFomoMult, FOMO_LEVELS } from "../config";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";
import { makeSampleSnapshot } from "../helpers/sample-data";
import { pushAllToSheet } from "../helpers/google-sync";
import { isConfigured } from "../../../lib/google/gis";
import { CloseIcon, ExportIcon, FomoIcon, ImportIcon, SparkleIcon } from "../../../components/icons";

export function GuestPanel() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const addGuest = useAppStore((s) => s.addGuest);
  const removeGuest = useAppStore((s) => s.removeGuest);
  const selectGuest = useAppStore((s) => s.selectGuest);
  const setGuestFomo = useAppStore((s) => s.setGuestFomo);
  const clearAll = useAppStore((s) => s.clearAll);
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);
  const google = useAppStore((s) => s.google);

  const loadSample = () => {
    if (
      guests.length > 0 &&
      !confirm("Replace the current guests and connections with sample data?")
    ) {
      return;
    }
    loadSnapshot(makeSampleSnapshot(), false);
  };

  const [name, setName] = useState("");
  const [dialog, setDialog] = useState<"import" | "export" | null>(null);

  // --- Search dropdown state ---
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const query = name.toLowerCase().trim();
  const matches = useMemo(() => {
    if (!query) return [];
    return guests.filter((g) => g.name.toLowerCase().includes(query));
  }, [guests, query]);

  const showDropdown = dropdownOpen && matches.length > 0;

  const measure = () => {
    if (formRef.current) {
      const r = formRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  };

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (formRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep the dropdown anchored while open.
  useEffect(() => {
    if (!showDropdown) return;
    const update = () => measure();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [showDropdown]);

  const selectMatch = (id: string) => {
    selectGuest(id);
    setName("");
    setDropdownOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setHighlight(0);
    measure();
    setDropdownOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showDropdown) { measure(); setDropdownOpen(true); }
      else setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (showDropdown && matches[highlight]) {
        e.preventDefault();
        selectMatch(matches[highlight].id);
      }
      // else: fall through to form onSubmit → add new guest
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  const submit = () => {
    if (addGuest(name)) setName("");
  };

  // Table assignment map for colored dots.
  const tableOfGuest = new Map<string, number>();
  result?.tables.forEach((t, i) =>
    t.guestIds.forEach((id) => tableOfGuest.set(id, i)),
  );

  const connectionCount = (id: string) =>
    connections.filter((c) => c.source === id || c.target === id).length;

  return (
    <Panel
      title="Guests"
      subtitle={`${guests.length}`}
      grow
      actions={
        <>
          {isConfigured() && google.spreadsheetId && (
            <button
              type="button"
              className="sync-icon-btn"
              title={google.status === "syncing" ? "Syncing…" : "Sync to Google Sheets"}
              aria-label="Sync to Google Sheets"
              disabled={google.status === "syncing"}
              onClick={() => pushAllToSheet()}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={google.status === "syncing" ? "sync-icon-spin" : ""}
              >
                <path d="M4 10a6 6 0 0 1 10.2-4.2M16 10a6 6 0 0 1-10.2 4.2" />
                <path d="M14.2 3.6v2.6h-2.6M5.8 16.4v-2.6h2.6" />
              </svg>
            </button>
          )}
          {guests.length > 0 && (
            <Button
              small
              variant="ghost"
              onClick={() => {
                if (confirm("Remove all guests and connections?")) clearAll();
              }}
            >
              Clear
            </Button>
          )}
        </>
      }
    >
      <form
        className="add-guest"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="add-guest-input-wrap" ref={formRef}>
          <input
            className="input"
            placeholder="Add a guest…"
            value={name}
            onChange={handleInputChange}
            onFocus={() => { if (matches.length > 0) { measure(); setDropdownOpen(true); } }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>

      {showDropdown &&
        rect &&
        createPortal(
          <ul
            ref={dropdownRef}
            className="combobox-list guest-search-dropdown"
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
          >
            {matches.map((g, i) => {
              const tableIdx = tableOfGuest.get(g.id);
              const conns = connectionCount(g.id);
              return (
                <li
                  key={g.id}
                  className={`combobox-option guest-search-option${i === highlight ? " is-active" : ""}${g.id === selectedGuestId ? " is-selected" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); selectMatch(g.id); }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span
                    className="guest-dot"
                    style={{
                      background:
                        tableIdx === undefined ? "var(--text-2)" : tableColor(tableIdx),
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{g.name}</span>
                  {conns > 0 && (
                    <span className="guest-meta">{conns}</span>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}

      <div className="guest-list">
        {guests.length === 0 && (
          <div className="guest-empty">
            <p className="empty-hint">
              Add your invitees, then select a guest to link them to others.
            </p>
            <p className="empty-hint">Or start from a ready-made example:</p>
            <Button variant="primary" block onClick={loadSample}>
              <SparkleIcon /> Load sample data
            </Button>
          </div>
        )}
        {guests.map((g) => {
          const tableIdx = tableOfGuest.get(g.id);
          const isSelected = g.id === selectedGuestId;
          return (
            <div
              key={g.id}
              className={`guest-row ${isSelected ? "guest-row-selected" : ""}`}
              onClick={() => selectGuest(isSelected ? null : g.id)}
            >
              <span
                className="guest-dot"
                style={{
                  background:
                    tableIdx === undefined ? "var(--text-2)" : tableColor(tableIdx),
                }}
              />
              <span className="guest-name">{g.name}</span>
              <button
                className="fomo-chip"
                title={`FOMO: ${fomoLevel(g.fomo).label} — click to change`}
                onClick={(e) => {
                  e.stopPropagation();
                  setGuestFomo(g.id, nextFomoMult(g.fomo));
                }}
              >
                <FomoIcon level={FOMO_LEVELS.indexOf(fomoLevel(g.fomo))} />
              </button>
              <span className="guest-meta">{connectionCount(g.id)}</span>
              <Button
                variant="danger"
                small
                onClick={(e) => {
                  e.stopPropagation();
                  removeGuest(g.id);
                }}
                aria-label={`Remove ${g.name}`}
              >
                <CloseIcon size={11} />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="io-row">
        <Button small onClick={() => setDialog("import")}>
          <ImportIcon /> Import
        </Button>
        <Button
          small
          onClick={() => setDialog("export")}
          disabled={guests.length === 0}
        >
          <ExportIcon /> Export
        </Button>
        <Button small onClick={loadSample}>
          <SparkleIcon /> Sample
        </Button>
      </div>

      {dialog === "import" && <ImportDialog onClose={() => setDialog(null)} />}
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
    </Panel>
  );
}
