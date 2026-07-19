import { useEffect, useState } from "react";
import { SeatingChart } from "./pages/seating-chart/seating-chart";
import { Landing } from "./pages/landing/landing";
import { ThemeToggle } from "./components/layout/theme-toggle";
import { useThemeStore } from "./store/use-theme-store";

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
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  if (path === "/app") {
    return <SeatingChart />;
  }

  return (
    <>
      <Landing onStart={() => navigate("/app")} />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
    </>
  );
}
