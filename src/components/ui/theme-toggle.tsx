"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if dark class is present on document element
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-9 w-16 items-center justify-center rounded-full",
        "bg-gray-200 dark:bg-gray-700 transition-colors duration-200",
        "hover:bg-gray-300 dark:hover:bg-gray-600",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      )}
      aria-label="Toggle theme"
    >
      <div
        className={cn(
          "absolute left-1 top-1 h-7 w-7 rounded-full bg-white dark:bg-gray-800",
          "flex items-center justify-center transition-transform duration-200",
          "shadow-sm",
          isDarkMode ? "translate-x-7" : "translate-x-0"
        )}
      >
        {isDarkMode ? (
          <Moon className="h-4 w-4 text-gray-600" />
        ) : (
          <Sun className="h-4 w-4 text-gray-600" />
        )}
      </div>
    </button>
  );
}