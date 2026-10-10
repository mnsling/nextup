import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("nextup-theme");

      if (saved === "dark" || saved === "light") {
        return saved;
      }
    } catch {
      // Browser storage is optional.
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem("nextup-theme", theme);
    } catch {
      // Keep the preference for the current visit.
    }
  }, [theme]);

  useEffect(() => {
    function sync(event) {
      if (
        event.key === "nextup-theme" &&
        ["dark", "light"].includes(event.newValue)
      ) {
        setTheme(event.newValue);
      }
    }

    window.addEventListener("storage", sync);

    return () => window.removeEventListener("storage", sync);
  }, []);

  return {
    theme,
    toggleTheme: () =>
      setTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}