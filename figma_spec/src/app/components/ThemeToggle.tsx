import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Switch } from "./ui/switch";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "pulse-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-2 text-slate-300">
      <span className="hidden text-sm sm:inline">Theme</span>
      <div className="flex items-center gap-1 rounded-full bg-slate-800/70 px-2 py-1 border border-slate-700/70">
        <Sun
          className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-yellow-300"}`}
        />
        <Switch
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Toggle dark mode"
        />
        <Moon
          className={`h-4 w-4 ${isDark ? "text-sky-300" : "text-slate-500"}`}
        />
      </div>
    </div>
  );
}

