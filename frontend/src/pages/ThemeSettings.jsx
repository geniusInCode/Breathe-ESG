import { useState, useEffect } from "react";

const THEME_PRESETS = [
  {
    id: "emerald",
    name: "Emerald Glow",
    icon: "🌿",
    description: "Classic carbon-offset layout with fresh mint and deep forest highlights.",
    primary: "#10b981",
    secondary: "#059669",
    scopes: ["#f43f5e", "#3b82f6", "#10b981"]
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    icon: "🌊",
    description: "Marine conservation themes with crisp deep-sea blues and aquatic cyan accents.",
    primary: "#06b6d4",
    secondary: "#0891b2",
    scopes: ["#f43f5e", "#2563eb", "#06b6d4"]
  },
  {
    id: "forest",
    name: "Forest Canopy",
    icon: "🪵",
    description: "Earth restoration model featuring warm moss, golden sand, and olive tones.",
    primary: "#84cc16",
    secondary: "#65a30d",
    scopes: ["#ef4444", "#3b82f6", "#84cc16"]
  }
];

export default function ThemeSettings({
  theme,
  setTheme,
  themePreset,
  setThemePreset,
  themeBlur,
  setThemeBlur
}) {
  const selectPreset = (id) => {
    setThemePreset(id);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Aesthetics &amp; Brand Styling</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          Customize the environment to match your corporate sustainability report standards.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Preset Selector Grid */}
        <div className="card-glass">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Brand Color Palettes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {THEME_PRESETS.map(preset => {
              const isActive = themePreset === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => selectPreset(preset.id)}
                  className="card-glass"
                  style={{
                    cursor: "pointer",
                    padding: "16px 20px",
                    border: isActive ? `2px solid ${preset.primary}` : "1px solid var(--border-glass)",
                    background: isActive ? "var(--color-primary-light)" : "var(--bg-card)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 28 }}>{preset.icon}</span>
                    <div>
                      <strong style={{ fontSize: 15, color: "var(--text-main)" }}>{preset.name}</strong>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{preset.description}</div>
                    </div>
                  </div>

                  {/* Swatch indicator dots */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: preset.primary }} />
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: preset.scopes[0] }} />
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: preset.scopes[1] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ambient Dark Mode Panel */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {/* Theme Mode Toggle */}
          <div className="card-glass">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Display Palette Mode</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20 }}>
              Toggle between highly readable light modes and energy-efficient dark modes.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setTheme("light")}
                className="btn-secondary"
                style={{
                  flex: 1,
                  background: theme === "light" ? "var(--color-primary-light)" : "transparent",
                  borderColor: theme === "light" ? "var(--color-primary)" : "var(--border-color)",
                  color: theme === "light" ? "var(--color-primary)" : "var(--text-main)"
                }}
              >
                ☀️ Light Mode
              </button>
              <button
                onClick={() => setTheme("dark")}
                className="btn-secondary"
                style={{
                  flex: 1,
                  background: theme === "dark" ? "var(--color-primary-light)" : "transparent",
                  borderColor: theme === "dark" ? "var(--color-primary)" : "var(--border-color)",
                  color: theme === "dark" ? "var(--color-primary)" : "var(--text-main)"
                }}
              >
                🌙 Dark Mode
              </button>
            </div>
          </div>

          {/* Glass blur control */}
          <div className="card-glass">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Glassmorphism Blur ({themeBlur}px)</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20 }}>
              Adjust the backdrop blur intensity of key cards to balance legibility and visuals.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="range"
                min="0"
                max="24"
                value={themeBlur}
                onChange={e => setThemeBlur(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: "var(--color-primary)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-light)" }}>
                <span>None (Fast)</span>
                <span>Medium</span>
                <span>Deep Blur</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live design system sandbox preview */}
        <div className="card-glass" style={{ background: "linear-gradient(135deg, var(--bg-card), var(--color-primary-light))" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Preview Sandbox</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20 }}>
            Visual preview of design buttons, input forms, and dynamic scopes using your current settings.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn-primary">Primary Action</button>
            <button className="btn-secondary">Secondary Link</button>
            
            <div style={{ display: "flex", gap: 6 }}>
              <span className="badge" style={{ background: "var(--color-scope1-light)", color: "var(--color-scope1)", border: "1px solid var(--color-scope1)33" }}>
                Scope 1
              </span>
              <span className="badge" style={{ background: "var(--color-scope2-light)", color: "var(--color-scope2)", border: "1px solid var(--color-scope2)33" }}>
                Scope 2
              </span>
              <span className="badge" style={{ background: "var(--color-scope3-light)", color: "var(--color-scope3)", border: "1px solid var(--color-scope3)33" }}>
                Scope 3
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
