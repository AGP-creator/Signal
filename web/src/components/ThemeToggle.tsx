"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("signal-theme") as Theme | null;
    const next: Theme = stored === "light" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("signal-theme", next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm !px-2.5"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <Sun
          className={`absolute h-3.5 w-3.5 transition-all duration-200 ${ready && theme === "dark" ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
          strokeWidth={1.75}
          aria-hidden
        />
        <Moon
          className={`absolute h-3.5 w-3.5 transition-all duration-200 ${ready && theme === "light" ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
    </button>
  );
}
