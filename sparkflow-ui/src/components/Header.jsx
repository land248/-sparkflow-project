// sparkflow-ui/src/components/Header.jsx
import React, { useContext } from "react";
import { ThemeContext } from "../lib/ThemeContext";
import { Sun, Moon } from "lucide-react";

export function Header() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <header className="bg-white dark:bg-gray-800 shadow p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
        SparkFLOW
      </h1>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-2 rounded bg-gray-200 dark:bg-gray-700"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>
  );
}
