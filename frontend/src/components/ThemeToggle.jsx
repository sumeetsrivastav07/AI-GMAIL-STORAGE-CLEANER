
import { useEffect, useState } from "react";
import "./ThemeToggle.css";

function getSavedTheme() {
    try {
        return localStorage.getItem("clearmail-theme") === "dark"
            ? "dark"
            : "light";
    } catch {
        return "light";
    }
}

function ThemeToggle() {
    const [theme, setTheme] = useState(getSavedTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;

        try {
            localStorage.setItem("clearmail-theme", theme);
        } catch {
            // The toggle still works if storage is unavailable.
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme((currentTheme) =>
            currentTheme === "light" ? "dark" : "light"
        );
    };

    const isDark = theme === "dark";

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
            <span className="theme-toggle-icon" aria-hidden="true">
                {isDark ? "☀" : "☾"}
            </span>

            <span>{isDark ? "Light mode" : "Dark mode"}</span>
        </button>
    );
}

export default ThemeToggle;
