import { useEffect, useState } from "react";
import { SeatingChart } from "./pages/seating-chart/seating-chart";
import { Landing } from "./pages/landing/landing";

function usePathname() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };

  return [path, navigate] as const;
}

export default function App() {
  const [path, navigate] = usePathname();

  if (path === "/app") {
    return <SeatingChart />;
  }
  return <Landing onStart={() => navigate("/app")} />;
}
