import { useEffect, useRef, useState } from "react";
import { GuestPanel } from "./components/guest-panel";
import { ConnectionEditor } from "./components/connection-editor";
import { GraphView } from "./components/graph-view";
import { TablesView } from "./components/tables-view";
import { SeatingPanel } from "./components/seating-panel";
import { GoogleSyncPanel } from "./components/google-sync-panel";
import { SidebarNav, type NavTab } from "./components/sidebar-nav";
import { useAppStore } from "../../store/use-app-store";
import "./seating-chart.css";

type CenterView = "graph" | "tables";

export function SeatingChart() {
  const result = useAppStore((s) => s.result);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const [view, setView] = useState<CenterView>("graph");
  const [navTab, setNavTab] = useState<NavTab>("guests");

  // Jump to the table visual the moment a chart is (re)generated.
  const hadResult = useRef(false);
  useEffect(() => {
    if (result && !hadResult.current) setView("tables");
    hadResult.current = !!result;
  }, [result]);

  // Selecting a guest jumps to the Connections tab to edit their links.
  useEffect(() => {
    if (selectedGuestId) setNavTab("connections");
  }, [selectedGuestId]);

  return (
    <div className="seating-chart">
      <div className="col col-nav">
        <SidebarNav active={navTab} onChange={setNavTab} />
      </div>

      <main className="col col-center">
        {result && (
          <div className="view-tabs">
            <button
              className={`view-tab ${view === "graph" ? "view-tab-active" : ""}`}
              onClick={() => setView("graph")}
            >
              Graph
            </button>
            <button
              className={`view-tab ${view === "tables" ? "view-tab-active" : ""}`}
              onClick={() => setView("tables")}
            >
              Tables
            </button>
          </div>
        )}
        <div className="view-body">
          {view === "tables" && result ? <TablesView /> : <GraphView />}
          {isGenerating && (
            <div className="generating-overlay">
              <div className="spinner" />
              <span>Generating seating…</span>
            </div>
          )}
        </div>
      </main>

      <aside className="col col-left">
        <div className="left-body">
          {navTab === "guests" && <GuestPanel />}
          {navTab === "connections" && <ConnectionEditor />}
          {navTab === "seating" && <SeatingPanel />}
          {navTab === "google" && <GoogleSyncPanel />}
        </div>
      </aside>
    </div>
  );
}
