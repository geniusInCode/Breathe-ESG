import { useState, useEffect } from "react";
import logoLight from "./breathe_esg_logo_light.png";
import logoDark from "./breathe_esg_logo_dark.png";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Review from "./pages/Review";
import AuditTrail from "./pages/AuditTrail";
import ThemeSettings from "./pages/ThemeSettings";
import Simulator from "./pages/Simulator";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [themePreset, setThemePreset] = useState(localStorage.getItem("theme-preset") || "emerald");
  const [themeBlur, setThemeBlur] = useState(parseInt(localStorage.getItem("theme-blur") || "12"));

  useEffect(() => {
    const fullTheme = `${theme}-${themePreset}`;
    document.documentElement.setAttribute("data-theme-preset", fullTheme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.setProperty("--blur-amount", `${themeBlur}px`);
    
    localStorage.setItem("theme", theme);
    localStorage.setItem("theme-preset", themePreset);
    localStorage.setItem("theme-blur", themeBlur.toString());
  }, [theme, themePreset, themeBlur]);

  const toggleTheme = () => {
    setTheme(t => (t === "light" ? "dark" : "light"));
  };

  const navItem = (p, label, icon) => {
    const isActive = page === p;
    return (
      <button
        key={p}
        onClick={() => setPage(p)}
        className={`tab-btn ${isActive ? "active" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 20px",
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14,
          background: isActive ? "var(--color-primary-light)" : "transparent",
          color: isActive ? "var(--color-primary)" : "var(--text-muted)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        <span>{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <div className="animate-fade-in" style={{ minHeight: "100vh" }}>
      {/* Header Panel */}
      <header className="glass-header">
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16
        }}>
          {/* Logo & Brand */}
          <a
            href="https://www.breatheesg.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              cursor: "pointer"
            }}
          >
            {/* Dynamic Transparent Logo */}
            <img
              src={theme === "dark" ? logoDark : logoLight}
              alt="Breathe ESG"
              style={{
                height: 32,
                width: "auto",
                transition: "transform 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1.0)"}
            />
          </a>

          {/* Navigation Tabs */}
          <nav className="tab-container" style={{ display: "flex", flexWrap: "wrap" }}>
            {navItem("dashboard",  "Dashboard", "📊")}
            {navItem("upload",     "Ingestion Hub", "📤")}
            {navItem("review",     "Review Queue", "🔍")}
            {navItem("simulator",  "Simulator", "🔮")}
            {navItem("audit",      "Audit Log", "📜")}
            {navItem("theme",      "Theme", "🎨")}
          </nav>

          {/* Right Accessories */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="switch-item"
              title="Toggle system palette"
              aria-label="Toggle system palette"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ paddingBottom: 80 }}>
        {page === "dashboard"  && <Dashboard />}
        {page === "upload"     && <Upload />}
        {page === "review"     && <Review />}
        {page === "simulator"  && <Simulator />}
        {page === "audit"      && <AuditTrail />}
        {page === "theme"      && (
          <ThemeSettings
            theme={theme}
            setTheme={setTheme}
            themePreset={themePreset}
            setThemePreset={setThemePreset}
            themeBlur={themeBlur}
            setThemeBlur={setThemeBlur}
          />
        )}
      </main>

      {/* Footer bar */}
      <footer style={{
        textAlign: "center",
        padding: "24px 0",
        color: "var(--text-light)",
        fontSize: 12,
        borderTop: "1px solid var(--border-color)",
        marginTop: 40
      }}>
        © 2026 Breathe ESG Carbon Intelligence Protocol. Enforcing GHG Standard Scopes 1, 2, and 3.
      </footer>
    </div>
  );
}