import { useEffect, useRef, useState } from "react";
import { GuestPanel } from "./components/guest-panel";
import { ConnectionEditor } from "./components/connection-editor";
import { GraphSettings } from "./components/graph-settings";
import { GraphView } from "./components/graph-view";
import { TablesView } from "./components/tables-view";
import { SeatingPanel } from "./components/seating-panel";
import { GoogleSyncPanel } from "./components/google-sync-panel";
import { useAppStore } from "../../store/use-app-store";
import "./seating-chart.css";

type CenterView = "graph" | "tables";
type LeftTab = "guests" | "connections" | "graph";

const LEFT_TABS: { id: LeftTab; label: string }[] = [
  { id: "guests", label: "Guests" },
  { id: "connections", label: "Connections" },
  { id: "graph", label: "Graph" },
];

export function SeatingChart() {
  const result = useAppStore((s) => s.result);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const [view, setView] = useState<CenterView>("graph");
  const [leftTab, setLeftTab] = useState<LeftTab>("guests");

  // Jump to the table visual the moment a chart is (re)generated.
  const hadResult = useRef(false);
  useEffect(() => {
    if (result && !hadResult.current) setView("tables");
    hadResult.current = !!result;
  }, [result]);

  // Selecting a guest jumps to the Connections tab to edit their links.
  useEffect(() => {
    if (selectedGuestId) setLeftTab("connections");
  }, [selectedGuestId]);

  return (
    <div className="seating-chart">
      <aside className="col col-left">
        <div className="left-tabs">
          {LEFT_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`left-tab ${leftTab === tab.id ? "left-tab-active" : ""}`}
              onClick={() => setLeftTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="left-body">
          {leftTab === "guests" && <GuestPanel />}
          {leftTab === "connections" && <ConnectionEditor />}
          {leftTab === "graph" && <GraphSettings />}
        </div>
      </aside>

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
        </div>
      </main>

      <aside className="col col-right">
        <SeatingPanel />
        <GoogleSyncPanel />
      </aside>
    </div>
  );
}
